import pg, { type PoolClient } from 'pg';

// Claims must come from the server's verified session, never from a request body.
export type DatabaseActor = { role: 'anon' } | { role: 'authenticated'; userId: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createDatabase(connectionString: string, max = 5) {
  const pool = new pg.Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
    application_name: 'newsvio-api',
  });
  // Do not print connection strings or query parameters from pool errors.
  pool.on('error', () => console.error('newsvio database connection lost'));

  async function transaction<T>(
    role: 'newsvio_anon' | 'newsvio_authenticated' | 'newsvio_service',
    claims: { role: string; sub?: string },
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query('begin');
      // These role names are a closed server-side union, not caller-supplied SQL.
      await client.query(`set local role ${role}`);
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(claims),
      ]);
      await client.query("set local statement_timeout = '15s'");
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      try {
        await client.query('rollback');
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }

  return {
    asUser<T>(actor: DatabaseActor, work: (client: PoolClient) => Promise<T>) {
      if (actor.role === 'authenticated') {
        if (!UUID.test(actor.userId)) throw new Error('invalid_verified_user');
        return transaction(
          'newsvio_authenticated',
          { role: 'authenticated', sub: actor.userId },
          work,
        );
      }
      return transaction('newsvio_anon', { role: 'anon' }, work);
    },
    // Only backend operations may use this: svc_* RPCs, private credentials, worker writes.
    asService<T>(work: (client: PoolClient) => Promise<T>) {
      return transaction('newsvio_service', { role: 'service_role' }, work);
    },
    close: () => pool.end(),
  };
}

export type ServerDatabase = ReturnType<typeof createDatabase>;
