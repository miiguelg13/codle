import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { VALUE_TYPES } from '../harness/types.js';

const i18n = { es: { type: String, default: '' }, en: { type: String, default: '' } };

const testCaseSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: new Schema(i18n, { _id: false }), required: false },
  },
  { _id: false },
);

export const LEVELS = [1, 2, 3, 4] as const; // 1 Fácil · 2 Medio · 3 Difícil · 4 Experto

const problemSchema = new Schema(
  {
    slug: { type: String, required: true },
    date: { type: String, required: true, index: true },
    level: { type: Number, enum: LEVELS, required: true },
    status: { type: String, enum: ['draft', 'pending', 'published', 'rejected'], default: 'draft', index: true },
    source: { type: String, enum: ['seed', 'ai', 'admin'], default: 'admin' },
    title: { type: new Schema(i18n, { _id: false }), required: true },
    statement: { type: new Schema(i18n, { _id: false }), required: true },
    constraints: { type: [String], default: [] },
    signature: {
      functionName: { type: String, required: true },
      params: [{ _id: false, name: String, type: { type: String, enum: VALUE_TYPES } }],
      returnType: { type: String, enum: VALUE_TYPES, required: true },
    },
    compare: { type: String, enum: ['exact', 'unordered', 'unordered-deep'], default: 'exact' },
    examples: { type: [testCaseSchema], default: [] },
    /** Tests ocultos */
    tests: { type: [testCaseSchema], default: [] },
    timeLimit: { type: Number, default: 5 },
    memoryLimit: { type: Number, default: 256 },
    referenceSolution: {
      language: { type: String },
      code: { type: String },
    },
    editorial: { type: new Schema(i18n, { _id: false }), required: false },
    tags: { type: [String], default: [] },
    importHash: { type: String },
  },
  { timestamps: true },
);

problemSchema.index({ date: 1, level: 1 }, { unique: true, partialFilterExpression: { status: 'published' } });

export type ProblemDoc = InferSchemaType<typeof problemSchema> & { _id: mongoose.Types.ObjectId };
export const Problem = mongoose.model('Problem', problemSchema);

export interface StoredTestCase {
  input: string;
  output: string;
  explanation?: { es: string; en: string };
}

export interface DecodedTestCase {
  input: unknown[];
  output: unknown;
  explanation?: { es: string; en: string };
}

export function encodeCase(tc: DecodedTestCase): StoredTestCase {
  return {
    input: JSON.stringify(tc.input),
    output: JSON.stringify(tc.output),
    ...(tc.explanation ? { explanation: tc.explanation } : {}),
  };
}

export function decodeCase(tc: StoredTestCase): DecodedTestCase {
  return {
    input: JSON.parse(tc.input),
    output: JSON.parse(tc.output),
    ...(tc.explanation && (tc.explanation.es || tc.explanation.en) ? { explanation: tc.explanation } : {}),
  };
}

export const HEAVY_FIELDS = '-tests -examples -referenceSolution';
