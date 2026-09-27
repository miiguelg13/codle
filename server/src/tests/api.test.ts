import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import mongoose from 'mongoose';
import { setExecutor } from '../executor/index.js';
import { LocalExecutor } from '../executor/local.js';
import { encodeCase, Problem } from '../models/Problem.js';
import { addDays, today } from '../services/dates.js';
import { computeStreaks } from '../services/stats.js';

test('computeStreaks', () => {
  const t = '2026-09-26';
  assert.deepEqual(computeStreaks([], t), { current: 0, max: 0, todayDone: false });
  assert.deepEqual(computeStreaks(['2026-09-26'], t), { current: 1, max: 1, todayDone: true });
  assert.deepEqual(computeStreaks(['2026-09-24', '2026-09-25'], t), { current: 2, max: 2, todayDone: false });
  // Hueco anteayer: se rompe.
  assert.deepEqual(computeStreaks(['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-24'], t), {
    current: 0,
    max: 3,
    todayDone: false,
  });
  // Cambio de mes
  assert.deepEqual(computeStreaks(['2026-08-31', '2026-09-01'], '2026-09-01'), { current: 2, max: 2, todayDone: true });
});

const MONGO = process.env.TEST_MONGODB_URI;

describe('API', { skip: !MONGO && 'define TEST_MONGODB_URI para ejecutar los tests de integración' }, () => {
  let base = '';
  let server: import('node:http').Server;
  let fizzId = '';
  let yesterdayId = '';

  class Client {
    cookie = '';
    async call(method: string, path: string, body?: unknown) {
      const res = await fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const set = res.headers.getSetCookie();
      if (set.length) this.cookie = set[set.length - 1].split(';')[0];
      const data = await res.json();
      return { status: res.status, data };
    }
  }

  const FIZZ_OK = `class Solution:
    def fizzBuzz(self, n):
        return ['FizzBuzz' if i % 15 == 0 else 'Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else str(i) for i in range(1, n + 1)]`;
  const FIZZ_BAD = 'class Solution:\n    def fizzBuzz(self, n):\n        return []';

  before(async () => {
    process.env.MONGODB_URI = `${MONGO!.replace(/\/$/, '')}/codle_test_${Date.now()}`;
    const { config } = await import('../config.js');
    config.mongoUri = process.env.MONGODB_URI;
    config.adminEmails = ['jefa@example.com'];
    setExecutor(new LocalExecutor());
    await mongoose.connect(config.mongoUri);
    const seed = JSON.parse(readFileSync(new URL('../seed/problems.json', import.meta.url), 'utf8'));
    const fizz = seed.find((p: { slug: string }) => p.slug === 'fizzbuzz');
    const t = today();
    const mk = (date: string, level: number, slug: string) => ({
      ...fizz,
      slug,
      level,
      date,
      status: 'published',
      source: 'seed',
      examples: fizz.examples.map(encodeCase),
      tests: fizz.tests.slice(0, 2).map(encodeCase),
    });
    const [a, b] = await Problem.create([mk(t, 1, 'fizz-hoy'), mk(addDays(t, -1), 1, 'fizz-ayer')]);
    fizzId = String(a._id);
    yesterdayId = String(b._id);
    const { createApp } = await import('../app.js');
    server = createApp().listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  after(async () => {
    server?.close();
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  test('invitado → registro → logout → login conserva el progreso', async () => {
    const c = new Client();
    let r = await c.call('GET', '/auth/me');
    assert.equal(r.data.user, null);
    assert.equal(r.data.streak.current, 0);
    assert.ok(c.cookie.startsWith('cdl_sid='));

    r = await c.call('POST', `/problems/${fizzId}/submit`, { language: 'python', code: FIZZ_BAD });
    assert.equal(r.data.solved, false);
    r = await c.call('POST', `/problems/${fizzId}/submit`, { language: 'python', code: FIZZ_OK });
    assert.equal(r.data.solved, true);
    r = await c.call('POST', `/problems/${yesterdayId}/submit`, { language: 'python', code: FIZZ_OK });
    assert.equal(r.data.solved, true);

    r = await c.call('GET', '/auth/me');
    assert.deepEqual(r.data.streak, { current: 1, max: 1, todayDone: true });

    r = await c.call('POST', '/auth/register', { email: 'Ana@Example.com', username: 'ana_dev', password: 'secreto123' });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(r.data.user.username, 'ana_dev');
    assert.equal(r.data.user.email, 'ana@example.com');
    assert.equal(r.data.merged, 2);

    r = await c.call('GET', '/stats');
    assert.equal(r.data.solved, 2);
    assert.equal(r.data.attempted, 2);
    assert.deepEqual(r.data.distribution, [1, 1, 0, 0, 0]);
    assert.equal(r.data.streak.current, 1);
    assert.equal(r.data.perfectDays, 1);
    assert.equal(r.data.languages.python, 2);

    r = await c.call('POST', '/auth/logout');
    r = await c.call('GET', '/auth/me');
    assert.equal(r.data.user, null);
    r = await c.call('GET', '/stats');
    assert.equal(r.data.solved, 0);

    await c.call('POST', `/problems/${fizzId}/submit`, { language: 'python', code: FIZZ_BAD });

    r = await c.call('POST', '/auth/login', { login: 'ana_dev', password: 'mala-clave' });
    assert.equal(r.status, 401);
    assert.equal(r.data.error, 'invalid_credentials');
    r = await c.call('POST', '/auth/login', { login: 'ANA@example.com', password: 'secreto123' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    r = await c.call('GET', `/problems/${fizzId}`);
    assert.equal(r.data.progress.solved, true);
    assert.equal(r.data.progress.attempts.length, 2);

    r = await c.call('GET', '/archive');
    assert.equal(r.status, 200);
    assert.equal(r.data.today, today());
    assert.deepEqual(
      r.data.problems.map((p: { slug: string; status: string; attempts: number }) => [p.slug, p.status, p.attempts]),
      [
        ['fizz-hoy', 'solved', 2],
        ['fizz-ayer', 'solved', 1],
      ],
    );
    const invitado = new Client();
    r = await invitado.call('GET', '/archive');
    assert.deepEqual(
      r.data.problems.map((p: { status: string }) => p.status),
      ['new', 'new'],
    );
  });

  test('validaciones de registro', async () => {
    const c = new Client();
    let r = await c.call('POST', '/auth/register', { email: 'ana@example.com', username: 'otra', password: 'secreto123' });
    assert.equal(r.status, 409);
    assert.equal(r.data.error, 'email_taken');
    r = await c.call('POST', '/auth/register', { email: 'b@example.com', username: 'ANA_DEV', password: 'secreto123' });
    assert.equal(r.data.error, 'username_taken');
    r = await c.call('POST', '/auth/register', { email: 'b@example.com', username: 'b', password: 'secreto123' });
    assert.equal(r.data.error, 'invalid_username');
    r = await c.call('POST', '/auth/register', { email: 'b@example.com', username: 'bbb', password: 'corta' });
    assert.equal(r.data.error, 'invalid_password');
    r = await c.call('POST', '/auth/register', { email: 'no-es-email', username: 'bbb', password: 'secreto123' });
    assert.equal(r.data.error, 'invalid_email');
  });

  test('panel de admin', async () => {
    const anon = new Client();
    let r = await anon.call('GET', '/admin/overview');
    assert.equal(r.status, 401);

    const normal = new Client();
    await normal.call('POST', '/auth/register', { email: 'normal@example.com', username: 'normal', password: 'secreto123' });
    r = await normal.call('GET', '/admin/overview');
    assert.equal(r.status, 403);

    const jefa = new Client();
    r = await jefa.call('POST', '/auth/register', { email: 'jefa@example.com', username: 'jefa', password: 'secreto123' });
    assert.equal(r.data.user.isAdmin, true);
    r = await jefa.call('GET', '/admin/overview');
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.nextDays.length, 8);

    r = await jefa.call('GET', '/admin/problems');
    assert.ok(r.data.length >= 2);
    const hoy = r.data.find((p: { slug: string }) => p.slug === 'fizz-hoy');
    assert.ok(hoy.players >= 1);

    const draft = {
      slug: 'doble',
      date: addDays(today(), 5),
      level: 2,
      status: 'draft',
      title: { es: 'Doble', en: 'Double' },
      statement: { es: 'Devuelve `2 * n`.', en: 'Return `2 * n`.' },
      constraints: [],
      tags: ['mates'],
      signature: { functionName: 'double', params: [{ name: 'n', type: 'int' }], returnType: 'long' },
      compare: 'exact',
      timeLimit: 5,
      examples: [{ input: [2] }],
      tests: [{ input: [0] }, { input: [2147483647] }],
      referenceSolution: { language: 'python', code: 'class Solution:\n    def double(self, n):\n        return 2 * n' },
    };
    r = await jefa.call('POST', '/admin/tools/compute-outputs', { problem: draft });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual(r.data.tests.map((c: { output: number }) => c.output), [0, 4294967294]);
    const full = { ...draft, examples: r.data.examples, tests: r.data.tests };

    r = await jefa.call('POST', '/admin/problems', { ...draft });
    assert.equal(r.status, 400, 'sin salidas no se puede guardar');
    r = await jefa.call('POST', '/admin/problems', full);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    const id = r.data.id;

    r = await jefa.call('POST', '/admin/tools/try', { problem: full, language: 'javascript', code: 'function double(n) { return n * 2; }' });
    assert.deepEqual(r.data.results.map((x: { verdict: string }) => x.verdict), ['pass', 'pass', 'pass']);
    r = await jefa.call('POST', '/admin/tools/try', { problem: full, language: 'javascript', code: 'function double(n) { return (n * 2) | 0; }' });
    assert.deepEqual(r.data.results.map((x: { verdict: string }) => x.verdict), ['pass', 'pass', 'fail']);

    r = await anon.call('GET', `/problems/${id}`);
    assert.equal(r.status, 404);

    r = await jefa.call('POST', `/admin/problems/${id}/status`, { status: 'published' });
    assert.equal(r.data.status, 'published');
    r = await jefa.call('PUT', `/admin/problems/${id}`, { ...full, title: { es: 'Doble!', en: 'Double!' }, status: 'published' });
    assert.equal(r.data.title.es, 'Doble!');

    r = await jefa.call('POST', '/admin/problems', { ...full, slug: 'doble-2', status: 'published' });
    assert.equal(r.status, 409);
    assert.equal(r.data.error, 'slot_taken');
    r = await jefa.call('POST', '/admin/problems', { ...full, status: 'draft' });
    assert.equal(r.data.error, 'slug_taken');

    r = await jefa.call('DELETE', `/admin/problems/${hoy.id}`);
    assert.equal(r.status, 409, 'con progreso no se borra');
    r = await jefa.call('DELETE', `/admin/problems/${id}`);
    assert.equal(r.status, 200);
  });
});
