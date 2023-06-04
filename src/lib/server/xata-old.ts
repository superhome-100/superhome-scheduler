import { XATA_API_KEY, XATA_BRANCH } from '$env/static/private';
import { XataClient } from './xata';

const instances: { [branch: string]: XataClient } = {};

export const getXataClient = (branch: string = XATA_BRANCH || 'main') => {
	if (instances[branch]) return instances[branch];
	instances[branch] = new XataClient({ apiKey: XATA_API_KEY, branch });
	return instances[branch];
};
