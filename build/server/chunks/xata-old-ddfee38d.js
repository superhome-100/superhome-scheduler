import { X as XataClient, a as XATA_API_KEY, b as XATA_BRANCH } from './xata.codegen-95200588.js';

const instances = {};
const getXataClient = (branch = XATA_BRANCH) => {
  if (instances[branch])
    return instances[branch];
  instances[branch] = new XataClient({ apiKey: XATA_API_KEY, branch });
  return instances[branch];
};

export { getXataClient as g };
//# sourceMappingURL=xata-old-ddfee38d.js.map
