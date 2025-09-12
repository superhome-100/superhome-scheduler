import { a as getBuoys } from './server-8060eee8.js';
import { j as json } from './index-29bd59f7.js';
import './xata-old-ddfee38d.js';
import './xata.codegen-95200588.js';
import '@xata.io/client';
import 'objects-to-csv';
import 'jszip';

const GET = async () => {
  try {
    const buoys = await getBuoys();
    return json({ status: "success", buoys });
  } catch (error) {
    return json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-45dd9554.js.map
