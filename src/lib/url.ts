import type { Dayjs } from 'dayjs';
import { getYYYYMMDD, PanglaoDayJs } from './datetimeUtils';

export const getCategoryDatePath = (category: string, date?: string | Date | Dayjs): string => {
	if (!['classroom', 'pool', 'openwater'].includes(category)) return '/';

	const yyyyMMDD = date ? getYYYYMMDD(PanglaoDayJs(date)) : '';
	if (date && yyyyMMDD && yyyyMMDD.split('-').length === 3) {
		return `/single-day/${category}/${yyyyMMDD}`;
	} else {
		return `/multi-day/${category}`;
	}
};
