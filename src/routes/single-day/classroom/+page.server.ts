import { getYYYYMMDD } from "$lib/datetimeUtils.js";
import { redirect } from "@sveltejs/kit";

export function load({ url }) {
    redirect(307, url.pathname + "/" + getYYYYMMDD(new Date()));
}
