import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import fetchRetry, { type FetchLibrary } from 'fetch-retry';

export const fetchRetryForSupabase = (fetchFn: FetchLibrary) => fetchRetry(fetchFn, {
    retries: 3, // Number of retry attempts
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    retryOn: [520], // Retry only on Cloudflare errors
})

export async function fetchAllRows<T>(
    supabase: SupabaseClient<Database>,
    table: keyof Database["public"]["Tables"],
    pk: string = "id",
    batchSize: number = 1000
): Promise<T[]> {
    const allRecords: T[] = [];
    let lastId: number | string | null = null;
    let keepFetching = true;

    while (keepFetching) {
        let query = supabase
            .from(table)
            .select('*')
            .order(pk, { ascending: true })
            .limit(batchSize);

        // Apply filter for keyset pagination
        if (lastId !== null) {
            query = query.gt(pk, lastId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Query failed: ${error.message}`);
        }

        if (data && data.length > 0) {
            allRecords.push(...(data as unknown as T[]));
            lastId = data[data.length - 1][pk];

            // If returned rows are less than batchSize, we reached the end
            if (data.length < batchSize) {
                keepFetching = false;
            }
        } else {
            keepFetching = false;
        }
    }

    return allRecords;
}
