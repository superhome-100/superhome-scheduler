// cron/append.js

// https://github.com/sveltejs/kit/issues/4841#issuecomment-3290611044
import { appendFile, readFile } from 'fs/promises';

const file = await readFile('cron/job.js', 'utf8');
await appendFile('.svelte-kit/cloudflare/_worker.js', file, 'utf8');
