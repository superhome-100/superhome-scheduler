import { Buoy } from '$types';

export async function load({ params }: { params: { day: string; page: string } }) {
	return {
		...params
	};
}
