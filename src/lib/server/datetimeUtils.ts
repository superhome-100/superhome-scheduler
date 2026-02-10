import { dayjs } from '../datetimeUtils';


export { dayjs };


// the server's local time is always UTC regardless of its physical location
export function dayJsInPanglaoFromServer() {
    const d = dayjs(new Date().getTime()).utc(true).tz('Asia/Manila');
    return d
}

// the server's local time is always UTC regardless of its physical location
export function datetimeInPanglaoFromServer() {
    return dayJsInPanglaoFromServer().toDate()
}