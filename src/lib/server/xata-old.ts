import { XATA_API_KEY } from '$env/static/private';
import { XataClient } from './xata';

export const getXataBranch = (branch: string) => {
	const client = new XataClient({ apiKey: XATA_API_KEY, branch });
	return client;
};
