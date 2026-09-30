// Fact-check pipeline and provider interface (LLD §11). Runs in the Edge Function (Deno)
// and in tests (Node). Relative imports carry .ts extensions for Deno.
export * from './normalize.ts';
export * from './pipeline.ts';
export * from './providers/gemini.ts';
export * from './providers/openai-compatible.ts';
export * from './providers/searxng.ts';
export * from './providers/types.ts';
export * from './router.ts';
export * from './sources.ts';
export * from './types.ts';
export * from './verdict.ts';
export { assertPublicUrl, safeFetch } from './tools/http.ts';
