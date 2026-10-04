import fs from 'node:fs';
import path from 'node:path';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'dycmubucexalixbtlbgp';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error(
    'SUPABASE_ACCESS_TOKEN est requis. Defini-le dans .env ou dans l’environnement, puis reessayez.',
  );
  process.exit(1);
}

async function runSql(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL Execution failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files to apply...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`Applying migration: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await runSql(sql);
      console.log(`✅ ${file} applied successfully.`);
    } catch (err) {
      console.error(`❌ Failed applying ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations applied successfully!');
}

main();
