import { describe, expect, it } from 'vitest';
import { namespaceLegacyRoles } from './sql-roles';

describe('shared-cluster role mapping', () => {
  it('maps grants and policy roles without changing claims, bodies, comments or identifiers', () => {
    const input = `-- authenticated\ngrant usage to anon, authenticated, service_role;\nselect 'service_role', "authenticated";\n/* anon /* authenticated */ service_role */\ncreate function f() returns text as $fn$ select 'anon' $fn$ language sql;\nselect authenticated_user;`;
    expect(namespaceLegacyRoles(input)).toBe(
      input.replace(
        'to anon, authenticated, service_role',
        'to newsvio_anon, newsvio_authenticated, newsvio_service',
      ),
    );
  });
  it('preserves escaped quotes and rejects incomplete SQL', () => {
    expect(namespaceLegacyRoles("select 'it''s authenticated'; grant usage to anon;")).toBe(
      "select 'it''s authenticated'; grant usage to newsvio_anon;",
    );
    for (const sql of ["select '", '/* open', 'do $$ begin'])
      expect(() => namespaceLegacyRoles(sql)).toThrow();
  });
});
