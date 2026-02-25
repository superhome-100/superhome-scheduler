import type { SupabaseClient, User } from "$types";

export interface Features {
    'pushNotificationEnabled': boolean;
}

type FeatureName = keyof Features;

export function getFeature<K extends FeatureName>(
    user: User | null,
    name: K,
    defaultValue: Features[K] | null
): Features[K] | null {
    return (user?.metadata as never)?.['feature']?.[name] ?? defaultValue;
}

export async function getFeatureById<K extends FeatureName>(
    supabase: SupabaseClient,
    userId: string,
    name: K,
    defaultValue: Features[K] | null
): Promise<Features[K] | null> {
    try {
        const { data } = await supabase.from("Users").select("metadata").eq("id", userId).single();
        return (data?.metadata as never)?.['feature']?.[name] ?? defaultValue;
    } catch (e) {
        console.error('getFeatureById', userId, name, defaultValue, e);
        return defaultValue;
    }
}

