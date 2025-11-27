import 'dotenv/config';
import { Client } from 'pg';

async function main() {
  const envPath = process.env.ENV_PATH || process.argv[2] || '../.env';

  // Load .env file explicitly when ENV_PATH or argv is provided
  if (envPath) {
    // dynamic import to avoid duplicate dotenv loading when using dotenv/config
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }

  const adminEmailsRaw = process.env.ADMIN_EMAILS || '';
  if (!adminEmailsRaw) {
    console.error('ADMIN_EMAILS is not set in the .env file');
    process.exit(1);
  }

  const emails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    console.error('ADMIN_EMAILS is empty after parsing');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('DATABASE_URL or SUPABASE_DB_URL is not set in the .env file');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('Looking up users for ADMIN_EMAILS:', emails.join(', '));

  // Query auth.users directly using a privileged connection
  const {
    rows: authUsers,
  } = await client.query<{ id: string; email: string | null }>(
    'SELECT id, email FROM auth.users WHERE lower(email) = ANY($1::text[])',
    [emails],
  );

  let updatedCount = 0;
  for (const email of emails) {
    const user = authUsers.find((u) => (u.email || '').toLowerCase() === email);
    if (!user) {
      console.warn(`No auth user found for email: ${email}`);
      continue;
    }

    console.log(`Granting admin to uid=${user.id} email=${user.email}`);

    try {
      await client.query(
        `INSERT INTO public.user_profiles (uid, privileges, updated_at)
         VALUES ($1::uuid, ARRAY['admin']::text[], now())
         ON CONFLICT (uid)
         DO UPDATE SET privileges = ARRAY['admin']::text[], updated_at = now();`,
        [user.id],
      );
    } catch (e: any) {
      console.error(
        `Failed to update user_profiles for uid=${user.id}:`,
        e?.message ?? e,
      );
      continue;
    }

    updatedCount += 1;
  }

  await client.end();

  console.log(`Done. Updated ${updatedCount} user_profiles row(s) to admin.`);
}

main().catch((err) => {
  console.error('Unexpected error in make-admin script:', err);
  process.exit(1);
});
