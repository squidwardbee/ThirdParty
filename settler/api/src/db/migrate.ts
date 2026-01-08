import fs from 'fs';
import path from 'path';
import { getPool } from './index';

async function migrate() {
  const pool = getPool();

  console.log('Starting database migration...');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const { rows: executed } = await pool.query('SELECT name FROM migrations');
    const executedNames = new Set(executed.map((r: { name: string }) => r.name));

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found. Creating...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('Migrations directory created. Add .sql files to run migrations.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    // Run pending migrations
    let migrationsRun = 0;

    for (const file of files) {
      if (executedNames.has(file)) {
        console.log(`Skipping (already executed): ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Run migration in a transaction
      await pool.query('BEGIN');

      try {
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`Completed: ${file}`);
        migrationsRun++;
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`Failed: ${file}`);
        throw error;
      }
    }

    console.log(`\nMigration complete. ${migrationsRun} migration(s) executed.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
