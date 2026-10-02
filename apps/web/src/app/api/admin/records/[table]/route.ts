import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Json } from '@prapp/db-types';
import { AppError, handleApi, parseBody, readJson, throwDbError } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { requireStaff } from '@/server/staff';

export const runtime = 'nodejs';

const uuid = z.uuid();
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => z.string().trim().max(max).nullable();
const int = z.number().int();

/**
 * Admin-managed reference tables (LLD §10). Each table lists the columns an admin may write
 * and how a row is identified; anything else is rejected before it reaches the database.
 * Writes run as the admin, so RLS and CHECK constraints still decide.
 */
const TABLES = {
  trusted_sources: {
    key: z.object({ domain: text(253).min(3) }),
    values: z
      .object({
        domain: text(253).min(3),
        tier: z.enum(['tier1', 'tier2']),
        category: z.enum(['government', 'fact_checker', 'news', 'reference', 'other']),
        note: optText(500),
      })
      .partial(),
    ops: ['upsert', 'delete'],
    stamp: 'added_by',
  },
  portals: {
    key: z.object({ id: uuid }),
    values: z
      .object({
        name: text(100).min(2),
        domain: text(253).min(3),
        homepage_url: z.url(),
        da_score: int.min(0).max(100).nullable(),
        category: optText(50),
        is_active: z.boolean(),
        show_publicly: z.boolean(),
        sort_order: int,
        logo_path: optText(300),
      })
      .partial(),
    ops: ['insert', 'update'],
    stamp: null,
  },
  packages: {
    key: z.object({ id: uuid }),
    values: z
      .object({
        code: text(40).min(1),
        name: text(100).min(1),
        description: optText(500),
        price_inr_paise: int.min(100),
        price_usd_cents: int.min(50).nullable(),
        portal_count: int.min(0),
        includes_instagram: z.boolean(),
        turnaround_hours: int.min(1).max(240),
        is_active: z.boolean(),
        sort_order: int,
      })
      .partial(),
    ops: ['insert', 'update'],
    stamp: null,
  },
  package_portals: {
    key: z.object({ package_id: uuid, portal_id: uuid }),
    values: z.object({ package_id: uuid, portal_id: uuid }),
    ops: ['insert', 'delete'],
    stamp: null,
  },
  app_settings: {
    key: z.object({ key: text(100).min(1) }),
    values: z.object({ value: z.json() }),
    ops: ['update'],
    stamp: 'updated_by',
  },
  showcase_stories: {
    key: z.object({ id: uuid }),
    values: z
      .object({
        title: text(200).min(1),
        portal_name: text(100).min(1),
        url: z.url(),
        sort_order: int,
        is_visible: z.boolean(),
        image_path: optText(300),
      })
      .partial(),
    ops: ['insert', 'update', 'delete'],
    stamp: 'created_by',
  },
} as const;

type Table = keyof typeof TABLES;
type Op = 'insert' | 'upsert' | 'update' | 'delete';

const bodySchema = z.object({
  op: z.enum(['insert', 'upsert', 'update', 'delete']),
  /** row identity for update / delete */
  match: z.record(z.string(), z.unknown()).optional(),
  /** one row, or several for insert */
  values: z
    .union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown())).max(200)])
    .optional(),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const r = schema.safeParse(value);
  if (!r.success) throw new AppError('validation_failed', r.error.issues);
  return r.data;
}

export const POST = handleApi(
  async (req: Request, ctx: RouteContext<'/api/admin/records/[table]'>) => {
    const { table: raw } = await ctx.params;
    if (!(raw in TABLES)) throw new AppError('validation_failed', { table: raw });
    const table = raw as Table;
    const spec = TABLES[table];
    const { supabase, user } = await requireStaff(req, 'admin');
    rateLimit(`admin-records:${user.id}`, 120, 60_000);
    const { op, match, values } = parseBody(bodySchema, await readJson(req));
    if (!(spec.ops as readonly Op[]).includes(op)) throw new AppError('not_authorized');

    // The generated client types each table separately; the specs above are the contract.
    const db = supabase.from(table as never) as unknown as {
      insert: (v: unknown) => QueryLike;
      upsert: (v: unknown) => QueryLike;
      update: (v: unknown) => QueryLike;
      delete: () => QueryLike;
    };
    const rows = (Array.isArray(values) ? values : values ? [values] : []).map((v) => {
      const row = parse(spec.values, v) as Record<string, unknown>;
      if (spec.stamp && (op !== 'update' || spec.stamp === 'updated_by')) row[spec.stamp] = user.id;
      return row;
    });

    let query: QueryLike;
    if (op === 'insert' || op === 'upsert') {
      if (!rows.length) throw new AppError('validation_failed', { values: 'required' });
      query = op === 'insert' ? db.insert(rows) : db.upsert(rows);
    } else {
      const key = parse(spec.key, match) as Record<string, string>;
      query = op === 'update' ? db.update(rows[0] ?? {}) : db.delete();
      for (const [k, v] of Object.entries(key)) query = query.eq(k, v);
    }
    const { data, error } = await query.select();
    if (error) throwDbError(error);
    return NextResponse.json({ ok: true, rows: (data ?? []) as Json[] });
  },
);

interface QueryLike {
  eq: (column: string, value: string) => QueryLike;
  select: () => PromiseLike<{
    data: unknown[] | null;
    error: { code?: string; message?: string } | null;
  }>;
}
