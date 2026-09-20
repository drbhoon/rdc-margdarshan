import 'dotenv/config';
import pg from 'pg';
import { writeFile } from 'node:fs/promises';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const columns = await client.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
  const constraints = await client.query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname");
  await client.query('ROLLBACK');
  await writeFile('audit/database-schema.json',JSON.stringify({columns:columns.rows,constraints:constraints.rows},null,2));
  console.log(JSON.stringify({tables:[...new Set(columns.rows.map(r=>r.table_name))],constraints:constraints.rowCount}));
} catch { console.error('Schema inspection failed; connection details suppressed.');process.exitCode=1; }
finally { await client.end(); }
