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
      const set = res.headers.get('set-cookie');
      if (set) this.cookie = set.split(';')[0];
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
});
