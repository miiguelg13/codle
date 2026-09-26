import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { User } from '../models/User.js';

const who = process.argv[2];
const remove = process.argv.includes('--remove');
if (!who) {
  console.error('Uso: npm run make-admin -w server -- <email|usuario> [--remove]');
  process.exit(1);
}
await connectDb();
const q = who.includes('@') ? { email: who.toLowerCase() } : { usernameLower: who.toLowerCase() };
const r = await User.updateOne(q, { $set: { isAdmin: !remove } });
console.log(r.matchedCount ? `OK: ${who} ${remove ? 'ya no es' : 'ahora es'} administrador` : `No existe el usuario ${who}`);
await mongoose.disconnect();
