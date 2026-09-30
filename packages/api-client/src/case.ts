// DB is snake_case, TS is camelCase; convert at the api-client boundary (CONTEXT §5).

type CamelCase<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<CamelCase<T>>}`
  : S;

export type Camelize<T> = T extends readonly (infer U)[]
  ? Camelize<U>[]
  : T extends Date
    ? T
    : T extends object
      ? { [K in keyof T as K extends string ? CamelCase<K> : K]: Camelize<T[K]> }
      : T;

export function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

export function camelize<T>(value: T): Camelize<T> {
  if (Array.isArray(value)) return value.map((v: unknown) => camelize(v)) as Camelize<T>;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [toCamelKey(k), camelize(v)]),
    ) as Camelize<T>;
  }
  return value as Camelize<T>;
}
