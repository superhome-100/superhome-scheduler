import type { User } from "$types";

export interface Features {
    'pushNotificationEnabled': boolean;
    'xataMigrationFilterDisabled': boolean;
    'admin-users': boolean;
}

type FeatureName = keyof Features;

export function getFeature<K extends FeatureName>(
    user: User | null,
    name: K,
    defaultValue: Features[K] | null
): Features[K] | null {
    return (user?.metadata as never)?.['feature']?.[name] ?? defaultValue;
}