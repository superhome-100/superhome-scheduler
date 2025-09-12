import dayjs from 'dayjs';

export const getCategoryDatePath = (category: string, date?: string | Date): string => {
	if (!['classroom', 'pool', 'openwater'].includes(category)) return '/';

	const yyyyMMDD = date ? dayjs(date).format('YYYY-MM-DD') : '';
	if (date && yyyyMMDD && yyyyMMDD.split('-').length === 3) {
		return `/single-day/${category}/${yyyyMMDD}`;
	} else {
		return `/multi-day/${category}`;
	}
};
