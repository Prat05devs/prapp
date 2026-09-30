import { z } from 'zod';
import {
  LIMITS,
  type FcConfidence,
  type FcInputType,
  type FcMode,
  type FcStatus,
  type FcVerdict,
  type SourceTier,
} from '../constants.ts';

// POST /api/fact-checks (LLD §11.1). Images arrive base64-encoded, already compressed on the device.

export const deviceIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{8,100}$/, 'Invalid device id');

const MAX_IMAGE_BASE64 = Math.ceil((LIMITS.factCheckImageMaxBytes * 4) / 3) + 8;

export const factCheckSubmitSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z
      .string()
      .trim()
      .min(10, 'Paste a longer message (at least 10 characters)')
      .max(LIMITS.factCheckTextMax),
    deviceId: deviceIdSchema,
  }),
  z.object({
    type: z.literal('url'),
    url: z
      .string()
      .trim()
      .max(2000)
      .refine(
        (v) => /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(v),
        'Paste a full link starting with https://',
      ),
    deviceId: deviceIdSchema,
  }),
  z.object({
    type: z.literal('image'),
    imageBase64: z.string().min(100).max(MAX_IMAGE_BASE64, 'Image must be 5 MB or smaller'),
    deviceId: deviceIdSchema,
  }),
]);

export type FactCheckSubmitInput = z.input<typeof factCheckSubmitSchema>;

export interface FactCheckSubmitResponse {
  id: string;
  reportId: string;
  status: FcStatus;
}

export interface FactCheckSourceView {
  url: string;
  domain: string;
  title: string | null;
  publisher: string | null;
  tier: SourceTier;
  stance: 'supports' | 'refutes' | 'context' | null;
  isExistingFactCheck: boolean;
  rating: string | null;
}

export interface FactCheckReport {
  id: string;
  reportId: string;
  status: FcStatus;
  error: string | null;
  inputType: FcInputType;
  inputText: string | null;
  inputUrl: string | null;
  inputDomain: string | null;
  inputDomainTier: SourceTier | null;
  inputDomainAgeDays: number | null;
  verdict: FcVerdict | null;
  confidence: FcConfidence | null;
  summary: string | null;
  language: string | null;
  mode: FcMode;
  fullCheckStatus: 'not_needed' | 'queued' | 'done';
  isPublic: boolean;
  checkedAt: string | null;
  createdAt: string;
  claims: {
    position: number;
    claimText: string;
    verdict: FcVerdict | null;
    explanation: string | null;
    isGovernmentRelated: boolean;
    sources: FactCheckSourceView[];
  }[];
  toolRuns: { tool: string; model: string | null; status: string; summary: string | null }[];
}

export interface FactCheckHistoryItem {
  id: string;
  reportId: string;
  status: FcStatus;
  inputType: FcInputType;
  preview: string;
  verdict: FcVerdict | null;
  isPublic: boolean;
  createdAt: string;
}
