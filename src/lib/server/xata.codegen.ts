// Generated by Xata Codegen 0.26.9. Please do not edit.
import { buildClient } from '@xata.io/client';
import type { BaseClientOptions, SchemaInference, XataRecord } from '@xata.io/client';

const tables = [
	{
		name: 'Reservations',
		columns: [
			{ name: 'owTime', type: 'string' },
			{ name: 'resType', type: 'string' },
			{ name: 'numStudents', type: 'int' },
			{ name: 'maxDepth', type: 'int' },
			{ name: 'comments', type: 'text' },
			{ name: 'user', type: 'link', link: { table: 'Users' } },
			{ name: 'startTime', type: 'string' },
			{ name: 'endTime', type: 'string' },
			{ name: 'category', type: 'string' },
			{
				name: 'createdAt',
				type: 'datetime',
				notNull: true,
				defaultValue: 'now'
			},
			{ name: 'date', type: 'string' },
			{ name: 'owner', type: 'bool', defaultValue: 'true' },
			{ name: 'buddies', type: 'multiple' },
			{ name: 'status', type: 'string', defaultValue: 'pending' },
			{ name: 'pulley', type: 'bool' },
			{ name: 'extraBottomWeight', type: 'bool' },
			{ name: 'bottomPlate', type: 'bool' },
			{ name: 'largeBuoy', type: 'bool' },
			{ name: 'lanes', type: 'multiple' },
			{ name: 'O2OnBuoy', type: 'bool' },
			{ name: 'buoy', type: 'string', defaultValue: 'auto' },
			{ name: 'room', type: 'string', defaultValue: 'auto' },
			{ name: 'price', type: 'int' },
			{
				name: 'updatedAt',
				type: 'datetime',
				notNull: true,
				defaultValue: 'now'
			},
			{
				name: 'shortSession',
				type: 'bool',
				notNull: true,
				defaultValue: 'false'
			},
			{
				name: 'allowAutoAdjust',
				type: 'bool',
				notNull: true,
				defaultValue: 'true'
			}
		]
	},
	{
		name: 'Users',
		columns: [
			{ name: 'name', type: 'string' },
			{
				name: 'status',
				type: 'string',
				notNull: true,
				defaultValue: '"disabled"'
			},
			{ name: 'facebookId', type: 'string', unique: true },
			{ name: 'privileges', type: 'string', defaultValue: 'normal' },
			{ name: 'nickname', type: 'string', unique: true },
			{ name: 'googleId', type: 'string' },
			{ name: 'email', type: 'string' },
			{ name: 'firebaseUID', type: 'string' }
		],
		revLinks: [
			{ column: '', table: 'Reservations' },
			{ column: '', table: 'Sessions' },
			{ column: 'user', table: 'NotificationReceipts' },
			{ column: 'user', table: 'UserPriceTemplates' }
		]
	},
	{
		name: 'Sessions',
		columns: [
			{
				name: 'createdAt',
				type: 'datetime',
				notNull: true,
				defaultValue: 'now'
			},
			{ name: 'user', type: 'link', link: { table: 'Users' } },
			{ name: 'viewMode', type: 'string', defaultValue: 'normal' }
		]
	},
	{
		name: 'Settings',
		columns: [
			{ name: 'name', type: 'string' },
			{ name: 'value', type: 'string' },
			{
				name: 'startDate',
				type: 'string',
				notNull: true,
				defaultValue: 'default'
			},
			{
				name: 'endDate',
				type: 'string',
				notNull: true,
				defaultValue: 'default'
			}
		]
	},
	{
		name: 'Buoys',
		columns: [
			{ name: 'name', type: 'string' },
			{ name: 'maxDepth', type: 'int' },
			{ name: 'pulley', type: 'bool' },
			{ name: 'extraBottomWeight', type: 'bool' },
			{ name: 'bottomPlate', type: 'bool' },
			{ name: 'largeBuoy', type: 'bool' }
		]
	},
	{ name: 'Boats', columns: [{ name: 'assignments', type: 'text' }] },
	{
		name: 'Notifications',
		columns: [
			{ name: 'message', type: 'text' },
			{ name: 'checkboxMessage', type: 'text' }
		],
		revLinks: [{ column: 'notification', table: 'NotificationReceipts' }]
	},
	{
		name: 'NotificationReceipts',
		columns: [
			{ name: 'user', type: 'link', link: { table: 'Users' } },
			{ name: 'notification', type: 'link', link: { table: 'Notifications' } }
		]
	},
	{
		name: 'PriceTemplates',
		columns: [
			{ name: 'coachOW', type: 'int' },
			{ name: 'coachPool', type: 'int' },
			{ name: 'coachClassroom', type: 'int' },
			{ name: 'autoOW', type: 'int' },
			{ name: 'autoPool', type: 'int' },
			{ name: 'cbsOW', type: 'int' },
			{ name: 'proSafetyOW', type: 'int', defaultValue: '0' },
			{ name: 'platformOW', type: 'int', defaultValue: '0' },
			{ name: 'platformCBSOW', type: 'int', defaultValue: '0' },
			{ name: 'comp-setupOW', type: 'int', defaultValue: '0' }
		],
		revLinks: [{ column: 'priceTemplate', table: 'UserPriceTemplates' }]
	},
	{
		name: 'UserPriceTemplates',
		columns: [
			{ name: 'user', type: 'link', link: { table: 'Users' } },
			{
				name: 'priceTemplate',
				type: 'link',
				link: { table: 'PriceTemplates' }
			},
			{ name: 'startDate', type: 'string', defaultValue: 'default' },
			{ name: 'endDate', type: 'string', defaultValue: 'default' }
		]
	},
	{
		name: 'BuoyGroupings',
		columns: [
			{ name: 'comment', type: 'string', notNull: true, defaultValue: '' },
			{ name: 'date', type: 'datetime' },
			{ name: 'buoy', type: 'string' },
			{ name: 'am_pm', type: 'string', notNull: true, defaultValue: 'am' }
		]
	}
] as const;

export type SchemaTables = typeof tables;
export type InferredTypes = SchemaInference<SchemaTables>;

export type Reservations = InferredTypes['Reservations'];
export type ReservationsRecord = Reservations & XataRecord;

export type Users = InferredTypes['Users'];
export type UsersRecord = Users & XataRecord;

export type Sessions = InferredTypes['Sessions'];
export type SessionsRecord = Sessions & XataRecord;

export type Settings = InferredTypes['Settings'];
export type SettingsRecord = Settings & XataRecord;

export type Buoys = InferredTypes['Buoys'];
export type BuoysRecord = Buoys & XataRecord;

export type Boats = InferredTypes['Boats'];
export type BoatsRecord = Boats & XataRecord;

export type Notifications = InferredTypes['Notifications'];
export type NotificationsRecord = Notifications & XataRecord;

export type NotificationReceipts = InferredTypes['NotificationReceipts'];
export type NotificationReceiptsRecord = NotificationReceipts & XataRecord;

export type PriceTemplates = InferredTypes['PriceTemplates'];
export type PriceTemplatesRecord = PriceTemplates & XataRecord;

export type UserPriceTemplates = InferredTypes['UserPriceTemplates'];
export type UserPriceTemplatesRecord = UserPriceTemplates & XataRecord;

export type BuoyGroupings = InferredTypes['BuoyGroupings'];
export type BuoyGroupingsRecord = BuoyGroupings & XataRecord;

export type DatabaseSchema = {
	Reservations: ReservationsRecord;
	Users: UsersRecord;
	Sessions: SessionsRecord;
	Settings: SettingsRecord;
	Buoys: BuoysRecord;
	Boats: BoatsRecord;
	Notifications: NotificationsRecord;
	NotificationReceipts: NotificationReceiptsRecord;
	PriceTemplates: PriceTemplatesRecord;
	UserPriceTemplates: UserPriceTemplatesRecord;
	BuoyGroupings: BuoyGroupingsRecord;
};

const DatabaseClient = buildClient();

const defaultOptions = {
	databaseURL: 'https://Superhome-Workspace-pmg7q5.us-west-2.xata.sh/db/superhome-scheduler'
};

export class XataClient extends DatabaseClient<DatabaseSchema> {
	constructor(options?: BaseClientOptions) {
		super({ ...defaultOptions, ...options }, tables);
	}
}

let instance: XataClient | undefined = undefined;

export const getXataClient = () => {
	if (instance) return instance;

	instance = new XataClient();
	return instance;
};
