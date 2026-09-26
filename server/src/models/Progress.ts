import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const attemptSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    language: { type: String, required: true },
    verdicts: { type: [String], default: [] },
    passed: { type: Number, required: true },
    total: { type: Number, required: true },
    timeMs: { type: Number },
  },
  { _id: false },
);

const progressSchema = new Schema(
  {
    playerId: { type: String, required: true, index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    date: { type: String, required: true },
    level: { type: Number, required: true },
    attempts: { type: [attemptSchema], default: [] },
    solved: { type: Boolean, default: false },
    solvedAt: { type: Date },
    solvedOnDay: { type: Boolean, default: false },
    pendingUntil: { type: Date },
    /** Último código enviado por lenguaje */
    lastCode: { type: Map, of: String, default: {} },
  },
  { timestamps: true },
);

progressSchema.index({ playerId: 1, problemId: 1 }, { unique: true });
progressSchema.index({ playerId: 1, date: 1 });

export type ProgressDoc = InferSchemaType<typeof progressSchema>;
export const Progress = mongoose.model('Progress', progressSchema);
