import type { Database, Enums, Tables, TablesInsert, TablesUpdate } from '$lib/supabase.types';
import { SupabaseClient as SSupabaseClient } from '@supabase/supabase-js';

export type SupabaseClient = SSupabaseClient<Database>;

export type AssertEqual<T, U extends T> = T extends U ? true : never;

export type RequireKeys<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]>; };

export type DeepNonNullable<T> = { [P in keyof T]-?: NonNullable<T[P]>; };

export type User_MetadataT = { feature: Record<string, unknown> }

export type User = Tables<'Users'>;

export type UserMinimal = RequireKeys<Tables<'UsersMinimal'>, 'id' | 'nickname' | 'status'>;

export type UserEx = Tables<'Users'> & {
	avatar_url: string | null,
	last_sign_in_at: string | null,
	has_push: boolean
};

export type UserStatusT = Enums<'user_status'>;
export enum UserStatus {
	active = 'active',
	disabled = 'disabled',
}

export type UserWithPriceTemplate = (User & {
	UserPriceTemplates: {
		priceTemplate: string;
	} | null
});

export type Boats = Tables<'Boats'>;

export type Buoys = Tables<'Buoys'>;

export type BuoyGroupings = Tables<'BuoyGroupings'>;

export type Notifications = Tables<'Notifications'>;

export type PriceTemplate = Tables<'PriceTemplates'>;

export type Reservation = Tables<'Reservations'>;

export type ReservationEx_User = { id: string, nickname: string, name: string };

export type ReservationEx = Tables<'Reservations'> & {
	user_json: ReservationEx_User, buddies_json: ReservationEx_User[]
};

export type ReservationPeriod = 'upcoming' | 'past';

/**
 * based on {@link unpackSubmitForm}
 */
export type ReservationCreationFormUnpacked = RequireKeys<
	TablesInsert<'Reservations'>,
	'user' | 'date' | 'category' | 'resType' | 'buddies' | 'startTime' | 'endTime'
> & { startTime: string; endTime: string };

export type Submission = ReservationCreationFormUnpacked;

export type OWSubmission = RequireKeys<ReservationCreationFormUnpacked, 'maxDepth'>;
export type OWReservation = RequireKeys<ReservationEx, 'maxDepth' | 'owTime' | 'buoy'>;

/**
 * based on {@link unpackModifyForm}
 */
export type ReservationModifyingFormUnpacked = RequireKeys<
	TablesUpdate<'Reservations'>,
	'id' | 'date' | 'category' | 'resType' | 'user' | 'buddies' | 'startTime' | 'endTime'
> & { startTime: string; endTime: string };

export enum OWTime {
	AM = 'AM',
	PM = 'PM'
}
export type OWTimeT = Enums<'reservation_ow_time'>;

export enum ReservationType {
	autonomous = 'autonomous',
	course = 'course',
	cbs = 'cbs',
	proSafety = 'proSafety',
	autonomousPlatform = 'autonomousPlatform',
	autonomousPlatformCBS = 'autonomousPlatformCBS',
	competitionSetupCBS = 'competitionSetupCBS'
}

export enum ReservationCategory {
	openwater = 'openwater',
	pool = 'pool',
	classroom = 'classroom'
}
export type ReservationCategoryT = Enums<'reservation_category'>

export enum ReservationStatus {
	confirmed = 'confirmed',
	pending = 'pending',
	rejected = 'rejected',
	canceled = 'canceled'
}

export type Buoy = Required<Tables<'Buoys'>>;

export interface BuddyData {
	name: string;
	userId: string | null;
	id?: number;
	matches?: any[];
}

export type AppFormData = {
	has(name: string): boolean
	get(name: string): string
};

export type DateReservationSummary = {
	pool: number;
	openwater: {
		AM: number;
		PM: number;
		ow_am_full: boolean;
	};
	classroom: number;
};

export type DateReservationReport = { date: string, summary: DateReservationSummary }


export type Notification = Tables<'Notifications'>;
export type BuoyGrouping = Tables<'BuoyGroupings'>;

export type ReservationWithPrices = Tables<'Reservations'> & { priceTemplate: Tables<'PriceTemplates'> };