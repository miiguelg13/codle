import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { seedExamples } from './examples.js';

try {
  await connectDb();
  await seedExamples({ ifNeeded: process.argv.includes('--if-needed') });
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
