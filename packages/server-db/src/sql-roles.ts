const ROLES: Record<string, string> = {
  anon: 'newsvio_anon',
  authenticated: 'newsvio_authenticated',
  service_role: 'newsvio_service',
};

/**
 * Historical SQL stays immutable. Only unquoted, top-level role identifiers are mapped
 * for the shared cluster. String literals, comments and function bodies stay byte-for-byte.
 * New standalone migrations use newsvio_* directly and do not pass through this mapper.
 */
export function namespaceLegacyRoles(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', i);
      const next = end < 0 ? sql.length : end;
      out += sql.slice(i, next);
      i = next;
      continue;
    }
    if (rest.startsWith('/*')) {
      let depth = 1;
      let end = i + 2;
      while (end < sql.length && depth) {
        if (sql.slice(end, end + 2) === '/*') {
          depth++;
          end += 2;
        } else if (sql.slice(end, end + 2) === '*/') {
          depth--;
          end += 2;
        } else end++;
      }
      if (depth) throw new Error('unterminated_sql_comment');
      out += sql.slice(i, end);
      i = end;
      continue;
    }
    const dollar = /^(\$[a-zA-Z_][a-zA-Z_0-9]*\$|\$\$)/.exec(rest)?.[0];
    if (dollar) {
      const end = sql.indexOf(dollar, i + dollar.length);
      if (end < 0) throw new Error('unterminated_sql_body');
      const next = end + dollar.length;
      out += sql.slice(i, next);
      i = next;
      continue;
    }
    if (sql[i] === "'" || sql[i] === '"') {
      const quote = sql[i];
      let end = i + 1;
      let closed = false;
      while (end < sql.length) {
        if (sql[end] === quote) {
          if (sql[end + 1] === quote) {
            end += 2;
            continue;
          }
          end++;
          closed = true;
          break;
        }
        end++;
      }
      if (!closed) throw new Error('unterminated_sql_quote');
      out += sql.slice(i, end);
      i = end;
      continue;
    }
    const word = /^[a-zA-Z_][a-zA-Z_0-9$]*/.exec(rest)?.[0];
    if (word) {
      out += ROLES[word.toLowerCase()] ?? word;
      i += word.length;
    } else {
      out += sql[i];
      i++;
    }
  }
  return out;
}
