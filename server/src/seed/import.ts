import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { importRetos } from '../services/importer.js';

await connectDb();
const r = await importRetos();
console.log(JSON.stringify(r, null, 2));
await mongoose.disconnect();
