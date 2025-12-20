import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Using pooler connection (usually has IPv4)
const connectionConfig = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.acvmkigubzldhpyrlail',
  password: 'L#XYB$NkC75p7g',
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  const client = new pg.Client(connectionConfig);

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
