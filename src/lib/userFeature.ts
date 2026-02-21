import type { User } from "$types";

export interface Features {
    'pushNotificationEnabled': boolean;
    'xataMigrationFilterDisabled': boolean;
}

type FeatureName = keyof Features;

export function getFeature<K extends FeatureName>(
    user: User,
    name: K,
    defaultValue: Features[K] | null
): Features[K] | null {
    // @ts-expect-error Element implicitly has an 'any' type
    return user?.metadata?.['feature']?.[name] ?? defaultValue;
}