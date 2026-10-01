// Edge Function environment. Supabase injects the project URL and platform API keys.
export function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() ? v : undefined;
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function siteUrl(): string {
  return (env('SITE_URL') ?? env('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000').replace(
    /\/+$/,
    '',
  );
}
