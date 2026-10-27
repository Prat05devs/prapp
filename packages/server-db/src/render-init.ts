import { loadMigrations } from './migrate';

/** Checksum-verified psql deployment for servers without a host Node installation. */
export async function renderDatabaseInit(root: string) {
  const migrations = await loadMigrations(root);
  const expected = migrations.map((m) => `('${m.name}','${m.checksum}')`).join(',\n');
  const header = `\\set ON_ERROR_STOP on
select pg_advisory_lock(hashtextextended(current_database() || ':newsvio-migrate', 0));
do $owner$ begin
  if current_database() <> 'newsvio' or current_user <> 'newsvio' then
    raise exception 'Connect as newsvio to its own newsvio database';
  end if;
end $owner$;
select to_regclass('newsvio_meta.migrations') is not null as has_history \\gset
\\if :has_history
  select not exists(
    select 1 from newsvio_meta.migrations m where not exists(
      select 1 from (values ${expected}) as source(name,checksum)
      where source.name=m.name and source.checksum=m.checksum
    )
  ) as history_valid \\gset
  \\if :history_valid
  \\else
    \\echo 'Migration history changed; deployment refused.'
    \\quit 1
  \\endif
\\else
  do $preflight$ begin
    if exists(select 1 from pg_namespace where nspname in ('auth','storage','private','newsvio_meta'))
      or exists(select 1 from pg_tables where schemaname='public') then
      raise exception 'Fresh installation requires an empty database; refusing to overwrite existing data';
    end if;
  end $preflight$;
  create schema newsvio_meta;
  revoke all on schema newsvio_meta from public;
  create table newsvio_meta.migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now());
\\endif
`;
  return (
    header +
    migrations
      .map(
        (m) => `
select exists(select 1 from newsvio_meta.migrations where name='${m.name}') as migration_applied \\gset
\\if :migration_applied
\\else
begin;
${m.sql}
insert into newsvio_meta.migrations(name,checksum) values ('${m.name}','${m.checksum}');
commit;
\\endif
`,
      )
      .join('') +
    "select pg_advisory_unlock(hashtextextended(current_database() || ':newsvio-migrate', 0));\n"
  );
}
