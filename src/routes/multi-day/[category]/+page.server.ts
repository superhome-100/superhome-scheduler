import { getYYYYMM } from "$lib/datetimeUtils.js";
import { redirect } from "@sveltejs/kit";

export function load({ url }) {
    throw redirect(307, url.pathname + "/" + getYYYYMM(new Date()));
}
