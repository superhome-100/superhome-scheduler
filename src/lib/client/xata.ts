import { env } from '$env/dynamic/public';
import { get } from 'svelte/store';
import { storedUser } from './stores';
import { getFeature } from '$lib/userFeature';

export const xataMigrationDayStrFilter = (d: string) => {
    const user = get(storedUser);
    if (user) {
        const filterDisabled = getFeature(user, 'xataMigrationFilterDisabled', null);
        if (filterDisabled === true) return true;
    }
    return env.PUBLIC_XATA_MIGRATION ? env.PUBLIC_XATA_MIGRATION <= d : true;
}