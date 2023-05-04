import { XataClient } from "$lib/server/xata.codegen.server.js";
import { XATA_API_KEY, XATA_BRANCH } from '$env/static/private';

let instance = undefined;
/** @type { () => XataClient } */
export const getXataClient = () => {
  if (instance) return instance;
  instance = new XataClient({ apiKey: XATA_API_KEY, branch: XATA_BRANCH });
  return instance;
};

export const getXataBranch = (branch) => {
    return new XataClient({ apiKey: XATA_API_KEY, branch });
};
