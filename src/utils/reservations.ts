import type { Tables } from '$lib/supabase.types';
import type { PriceTemplate, Submission } from '$types';

export const getNumberOfOccupants = (rsvs: Submission[]) =>
	rsvs.reduce((n, rsv) => {
		if (rsv.category === 'classroom') {
			return n + (rsv.numStudents ?? 0);
		} else if (rsv.resType === 'course') {
			return n + 2 * Math.ceil((rsv.numStudents ?? 0) / 2);
		} else {
			return n + 1
		}
	}, 0);


export const getPriceForReservation = (rsv: Tables<'Reservations'> | Tables<'ReservationsWithPrices'>, priceTemplate: PriceTemplate) => {
	switch (rsv.category) {
		default:
			throw Error(`assert: ${rsv.category}`);
		case 'pool':
			switch (rsv.resType) {
				default:
					throw Error(`assert: ${rsv.resType}`);
				case 'autonomous':
					return priceTemplate.autoPool;
				case 'course':
					return priceTemplate.coachPool;
			}
		case 'classroom':
			switch (rsv.resType) {
				default:
					throw Error(`assert: ${rsv.resType}`);
				case 'course':
					if (!rsv.numStudents) throw Error(`numStudents error: ${rsv.id}`);
					return priceTemplate.coachClassroom * rsv.numStudents;
			}
		case 'openwater':
			switch (rsv.resType) {
				default:
					throw Error(`assert: ${rsv.resType}`);
				case 'autonomous': return priceTemplate.autoOW;
				case 'autonomousPlatform': return priceTemplate.platformOW;
				case 'autonomousPlatformCBS': return priceTemplate.platformCBSOW;
				case 'cbs': return priceTemplate.cbsOW;
				case 'competitionSetupCBS':
					return priceTemplate['comp-setupOW'];
				case 'proSafety':
					return priceTemplate.proSafetyOW;
				case 'course':
					if (!rsv.numStudents) throw Error(`numStudents error: ${rsv.id}`);
					return priceTemplate.coachOW * rsv.numStudents;
			}
	}
}