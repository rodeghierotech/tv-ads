// Read-only inventory; never prints connection strings, account identifiers or tokens.
require('@next/env').loadEnvConfig(process.cwd());
const postgres = require('postgres');

(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente');
  const sql = postgres(process.env.DATABASE_URL, { prepare:false, max:1, connect_timeout:10, idle_timeout:2 });
  try {
    const result = await sql.begin('read only', async tx => {
      await tx`SET LOCAL statement_timeout = '10s'`;
      const columns = await tx`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('tv','account','player_rate_limit')`;
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
      const has = (table, column) => columns.some(c=>c.table_name===table && c.column_name===column);
      const [accounts] = await tx`SELECT count(*)::int AS total, count(*) FILTER (WHERE email_verified)::int AS verified FROM "user"`;
      const [sessions] = await tx`SELECT count(*) FILTER (WHERE expires_at > now())::int AS active, count(*) FILTER (WHERE expires_at <= now())::int AS expired FROM "session"`;
      const [providers] = await tx`SELECT count(*) FILTER (WHERE provider_id <> 'credential')::int AS other_providers FROM "account"`;
      const registry = await tx`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
      const migrations = registry[0].name ? await tx`SELECT count(*)::int AS applied, max(created_at)::text AS latest FROM drizzle.__drizzle_migrations` : [];
      return { schema:{tvToken:has('tv','device_token_hash'),accountIssuer:has('account','issuer'),rateLimit:tables.some(t=>t.table_name==='player_rate_limit')},accounts,sessions,providers,migrations };
    });
    console.log(JSON.stringify(result,null,2));
  } finally { await sql.end({timeout:5}); }
})().catch(error=>{console.error('Inventário somente leitura falhou:',error.code || error.name);process.exitCode=1;});
