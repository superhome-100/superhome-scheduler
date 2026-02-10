import { env } from '$env/dynamic/private';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export { dayjs };

const PhilippinesTimezoneOffsetInMinutes = 480;


// the server's local time is always UTC regardless of its physical location
export function datetimeInPanglaoFromServer() {
    let d = new Date();
    if (env.CF_RUNTIME === 'true')
        return new Date(d.getTime() + PhilippinesTimezoneOffsetInMinutes * 60 * 1000);
    else return d
}

// the server's local time is always UTC regardless of its physical location
export function dayJsInPanglaoFromServer() {
    const d = dayjs();
    if (env.CF_RUNTIME === 'true')
        return dayjs().add(PhilippinesTimezoneOffsetInMinutes * 60 * 1000, 'milliseconds');
    else return d
}