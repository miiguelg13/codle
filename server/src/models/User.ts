import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { config } from '../config.js';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    usernameLower: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model('User', userSchema);

export function isAdminUser(u: Pick<UserDoc, 'email' | 'isAdmin'>): boolean {
  return !!u.isAdmin || config.adminEmails.includes(u.email.toLowerCase());
}

export function publicUser(u: Pick<UserDoc, '_id' | 'email' | 'username' | 'isAdmin'>) {
  return { id: String(u._id), email: u.email, username: u.username, isAdmin: isAdminUser(u) };
}
