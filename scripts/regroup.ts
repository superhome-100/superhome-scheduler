import 'dotenv/config';
import dayjs from 'dayjs';
import { createClient } from '@supabase/supabase-js';

async function main() {
  // Optional CLI arg: date string (YYYY-MM-DD). Defaults to tomorrow.
  const argDate = process.argv[2] ?? null;

  const target = argDate ? dayjs(argDate) : dayjs().add(1, 'day');
  if (!target.isValid()) {
    console.error('Invalid date argument. Expected format YYYY-MM-DD, got:', argDate);
    process.exit(1);
  }

  const resDate = target.format('YYYY-MM-DD');

  // Use SUPABASE_URL from env, fallback to local default
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabaseKey = supabaseAnonKey || serviceRoleKey;
  if (!supabaseKey) {
    console.error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is not set in the .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Triggering auto-assign-buoy for ${resDate} (AM & PM)`);

  const periods: Array<'AM' | 'PM'> = ['AM', 'PM'];
  let succeeded = 0;

  for (const period of periods) {
    try {
      const { data, error } = await supabase.functions.invoke('auto-assign-buoy', {
        body: { res_date: resDate, time_period: period },
      });

      if (error) {
        console.error(`  - ${period} failed:`, error.message ?? error);
        continue;
      }

      console.log(`  - triggered ${period}`, data ?? '');
      succeeded += 1;
    } catch (e: any) {
      console.error(
        `  - ${period} error while calling auto-assign-buoy:`,
        e?.message ?? e,
      );
    }
  }

  console.log(
    `Done. Successfully triggered auto-assign-buoy for ${succeeded} period(s) on ${resDate}.`,
  );
}

main().catch((err) => {
  console.error('Unexpected error in regroup script:', err);
  process.exit(1);
});
