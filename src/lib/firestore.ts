import { firestore } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import dayjs from 'dayjs';
import { PUBLIC_STAGE } from '$env/static/public';
/*
flag a date in firestore as configured
date_settings_[stage]
    [YYYY-MM-DD]
        ow_am_full: true
*/

interface DateSetting {
	ow_am_full: boolean;
}

const stage = PUBLIC_STAGE || 'prod';
const defaultSetting = {
	ow_am_full: false
};

export async function flagOWAmAsFull(date: Date, state: boolean) {
	// TODO: probably move this to transaction eventually to prevent overwrites
	const dateSetting = doc(firestore, `date_settings_${stage}/${dayjs(date).format('YYYY-MM-DD')}`);
	await setDoc(dateSetting, {
		ow_am_full: state
	});
}

export function listenToDateSetting(date: Date, cb: (setting: DateSetting) => void) {
	const dateSetting = doc(firestore, `date_settings_${stage}/${dayjs(date).format('YYYY-MM-DD')}`);
	return onSnapshot(dateSetting, (next) => {
		cb((next.data() || defaultSetting) as DateSetting);
	});
}

export function listenOnDateUpdate(date: Date, category: string, cb: () => void) {
	const dateLockDoc = `locks/${category}_${dayjs(date).format('YYYY-MM-DD')}_${stage}`;
	const dateSetting = doc(firestore, dateLockDoc);
	return onSnapshot(dateSetting, (next) => {
		cb();
	});
}