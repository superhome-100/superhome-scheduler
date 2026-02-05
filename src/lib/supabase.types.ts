export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			Boats: {
				Row: {
					assignments: string | null;
					createdAt: string;
					id: string;
					updatedAt: string;
				};
				Insert: {
					assignments?: string | null;
					createdAt?: string;
					id?: string;
					updatedAt?: string;
				};
				Update: {
					assignments?: string | null;
					createdAt?: string;
					id?: string;
					updatedAt?: string;
				};
				Relationships: [];
			};
			BuoyGroupings: {
				Row: {
					am_pm: string;
					buoy: string;
					comment: string | null;
					createdAt: string;
					date: string;
					id: string;
					updatedAt: string;
				};
				Insert: {
					am_pm?: string;
					buoy?: string;
					comment?: string | null;
					createdAt?: string;
					date?: string;
					id: string;
					updatedAt?: string;
				};
				Update: {
					am_pm?: string;
					buoy?: string;
					comment?: string | null;
					createdAt?: string;
					date?: string;
					id?: string;
					updatedAt?: string;
				};
				Relationships: [];
			};
			Buoys: {
				Row: {
					bottomPlate: boolean | null;
					createdAt: string;
					extraBottomWeight: boolean | null;
					id: string;
					largeBuoy: boolean | null;
					maxDepth: number | null;
					name: string;
					pulley: boolean | null;
					updatedAt: string;
				};
				Insert: {
					bottomPlate?: boolean | null;
					createdAt?: string;
					extraBottomWeight?: boolean | null;
					id?: string;
					largeBuoy?: boolean | null;
					maxDepth?: number | null;
					name: string;
					pulley?: boolean | null;
					updatedAt?: string;
				};
				Update: {
					bottomPlate?: boolean | null;
					createdAt?: string;
					extraBottomWeight?: boolean | null;
					id?: string;
					largeBuoy?: boolean | null;
					maxDepth?: number | null;
					name?: string;
					pulley?: boolean | null;
					updatedAt?: string;
				};
				Relationships: [];
			};
			DaySettings: {
				Row: {
					createdAt: string;
					date: string;
					key: string;
					updatedAt: string;
					value: Json;
				};
				Insert: {
					createdAt?: string;
					date: string;
					key: string;
					updatedAt?: string;
					value: Json;
				};
				Update: {
					createdAt?: string;
					date?: string;
					key?: string;
					updatedAt?: string;
					value?: Json;
				};
				Relationships: [];
			};
			NotificationReceipts: {
				Row: {
					createdAt: string;
					notification: string;
					user: string;
				};
				Insert: {
					createdAt?: string;
					notification: string;
					user: string;
				};
				Update: {
					createdAt?: string;
					notification?: string;
					user?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'notificationreceipts_notification_key';
						columns: ['notification'];
						isOneToOne: false;
						referencedRelation: 'Notifications';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'notificationreceipts_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'Users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'notificationreceipts_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'UsersMinimal';
						referencedColumns: ['id'];
					}
				];
			};
			Notifications: {
				Row: {
					checkboxMessage: string;
					createdAt: string;
					id: string;
					message: string;
					updatedAt: string;
				};
				Insert: {
					checkboxMessage: string;
					createdAt?: string;
					id?: string;
					message: string;
					updatedAt?: string;
				};
				Update: {
					checkboxMessage?: string;
					createdAt?: string;
					id?: string;
					message?: string;
					updatedAt?: string;
				};
				Relationships: [];
			};
			PriceTemplates: {
				Row: {
					autoOW: number | null;
					autoPool: number | null;
					cbsOW: number | null;
					coachClassroom: number | null;
					coachOW: number | null;
					coachPool: number | null;
					'comp-setupOW': number | null;
					createdAt: string;
					id: string;
					platformCBSOW: number | null;
					platformOW: number | null;
					proSafetyOW: number | null;
					updatedAt: string;
				};
				Insert: {
					autoOW?: number | null;
					autoPool?: number | null;
					cbsOW?: number | null;
					coachClassroom?: number | null;
					coachOW?: number | null;
					coachPool?: number | null;
					'comp-setupOW'?: number | null;
					createdAt?: string;
					id?: string;
					platformCBSOW?: number | null;
					platformOW?: number | null;
					proSafetyOW?: number | null;
					updatedAt?: string;
				};
				Update: {
					autoOW?: number | null;
					autoPool?: number | null;
					cbsOW?: number | null;
					coachClassroom?: number | null;
					coachOW?: number | null;
					coachPool?: number | null;
					'comp-setupOW'?: number | null;
					createdAt?: string;
					id?: string;
					platformCBSOW?: number | null;
					platformOW?: number | null;
					proSafetyOW?: number | null;
					updatedAt?: string;
				};
				Relationships: [];
			};
			Reservations: {
				Row: {
					allowAutoAdjust: boolean;
					bottomPlate: boolean | null;
					buddies: string[];
					buoy: string | null;
					category: Database['public']['Enums']['reservation_category'];
					comments: string | null;
					createdAt: string;
					date: string;
					endTime: string;
					extraBottomWeight: boolean | null;
					id: string;
					lanes: string[] | null;
					largeBuoy: boolean | null;
					maxDepth: number | null;
					numStudents: number | null;
					O2OnBuoy: boolean | null;
					owner: boolean;
					owTime: string | null;
					price: number | null;
					pulley: boolean | null;
					resType: Database['public']['Enums']['reservation_type'];
					room: string | null;
					shortSession: boolean;
					startTime: string;
					status: Database['public']['Enums']['reservation_status'];
					updatedAt: string;
					user: string;
				};
				Insert: {
					allowAutoAdjust?: boolean;
					bottomPlate?: boolean | null;
					buddies?: string[];
					buoy?: string | null;
					category: Database['public']['Enums']['reservation_category'];
					comments?: string | null;
					createdAt?: string;
					date: string;
					endTime: string;
					extraBottomWeight?: boolean | null;
					id?: string;
					lanes?: string[] | null;
					largeBuoy?: boolean | null;
					maxDepth?: number | null;
					numStudents?: number | null;
					O2OnBuoy?: boolean | null;
					owner?: boolean;
					owTime?: string | null;
					price?: number | null;
					pulley?: boolean | null;
					resType: Database['public']['Enums']['reservation_type'];
					room?: string | null;
					shortSession?: boolean;
					startTime: string;
					status?: Database['public']['Enums']['reservation_status'];
					updatedAt?: string;
					user: string;
				};
				Update: {
					allowAutoAdjust?: boolean;
					bottomPlate?: boolean | null;
					buddies?: string[];
					buoy?: string | null;
					category?: Database['public']['Enums']['reservation_category'];
					comments?: string | null;
					createdAt?: string;
					date?: string;
					endTime?: string;
					extraBottomWeight?: boolean | null;
					id?: string;
					lanes?: string[] | null;
					largeBuoy?: boolean | null;
					maxDepth?: number | null;
					numStudents?: number | null;
					O2OnBuoy?: boolean | null;
					owner?: boolean;
					owTime?: string | null;
					price?: number | null;
					pulley?: boolean | null;
					resType?: Database['public']['Enums']['reservation_type'];
					room?: string | null;
					shortSession?: boolean;
					startTime?: string;
					status?: Database['public']['Enums']['reservation_status'];
					updatedAt?: string;
					user?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'reservations_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'Users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'reservations_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'UsersMinimal';
						referencedColumns: ['id'];
					}
				];
			};
			Settings: {
				Row: {
					createdAt: string;
					endDate: string;
					id: string;
					name: string | null;
					startDate: string;
					updatedAt: string;
					value: string | null;
				};
				Insert: {
					createdAt?: string;
					endDate?: string;
					id?: string;
					name?: string | null;
					startDate?: string;
					updatedAt?: string;
					value?: string | null;
				};
				Update: {
					createdAt?: string;
					endDate?: string;
					id?: string;
					name?: string | null;
					startDate?: string;
					updatedAt?: string;
					value?: string | null;
				};
				Relationships: [];
			};
			UserPriceTemplates: {
				Row: {
					createdAt: string;
					endDate: string | null;
					id: string;
					priceTemplate: string;
					startDate: string | null;
					updatedAt: string;
					user: string | null;
				};
				Insert: {
					createdAt?: string;
					endDate?: string | null;
					id?: string;
					priceTemplate: string;
					startDate?: string | null;
					updatedAt?: string;
					user?: string | null;
				};
				Update: {
					createdAt?: string;
					endDate?: string | null;
					id?: string;
					priceTemplate?: string;
					startDate?: string | null;
					updatedAt?: string;
					user?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'userpricetemplates_pricetemplate_key';
						columns: ['priceTemplate'];
						isOneToOne: false;
						referencedRelation: 'PriceTemplates';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'userpricetemplates_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'Users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'userpricetemplates_user_key';
						columns: ['user'];
						isOneToOne: false;
						referencedRelation: 'UsersMinimal';
						referencedColumns: ['id'];
					}
				];
			};
			Users: {
				Row: {
					authId: string | null;
					authProvider: string | null;
					createdAt: string;
					email: string | null;
					id: string;
					metadata: Json | null;
					name: string;
					nickname: string;
					privileges: Database['public']['Enums']['user_privilege'];
					status: Database['public']['Enums']['user_status'];
					updatedAt: string;
				};
				Insert: {
					authId?: string | null;
					authProvider?: string | null;
					createdAt?: string;
					email?: string | null;
					id: string;
					metadata?: Json | null;
					name: string;
					nickname: string;
					privileges?: Database['public']['Enums']['user_privilege'];
					status?: Database['public']['Enums']['user_status'];
					updatedAt?: string;
				};
				Update: {
					authId?: string | null;
					authProvider?: string | null;
					createdAt?: string;
					email?: string | null;
					id?: string;
					metadata?: Json | null;
					name?: string;
					nickname?: string;
					privileges?: Database['public']['Enums']['user_privilege'];
					status?: Database['public']['Enums']['user_status'];
					updatedAt?: string;
				};
				Relationships: [];
			};
			UserSessions: {
				Row: {
					createdAt: string;
					pushSubscription: Json | null;
					sessionId: string;
					updatedAt: string;
					userId: string;
				};
				Insert: {
					createdAt?: string;
					pushSubscription?: Json | null;
					sessionId: string;
					updatedAt?: string;
					userId: string;
				};
				Update: {
					createdAt?: string;
					pushSubscription?: Json | null;
					sessionId?: string;
					updatedAt?: string;
					userId?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'user_sessions_user_id_fkey';
						columns: ['userId'];
						isOneToOne: false;
						referencedRelation: 'Users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'user_sessions_user_id_fkey';
						columns: ['userId'];
						isOneToOne: false;
						referencedRelation: 'UsersMinimal';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			ReservationsReport: {
				Row: {
					category: Database['public']['Enums']['reservation_category'] | null;
					count: number | null;
					date: string | null;
					owTime: string | null;
				};
				Relationships: [];
			};
			UsersMinimal: {
				Row: {
					id: string | null;
					nickname: string | null;
					status: Database['public']['Enums']['user_status'] | null;
				};
				Insert: {
					id?: string | null;
					nickname?: string | null;
					status?: Database['public']['Enums']['user_status'] | null;
				};
				Update: {
					id?: string | null;
					nickname?: string | null;
					status?: Database['public']['Enums']['user_status'] | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			get_unread_notifications: {
				Args: { p_user_id: string };
				Returns: {
					checkboxMessage: string;
					createdAt: string;
					id: string;
					message: string;
					updatedAt: string;
				}[];
				SetofOptions: {
					from: '*';
					to: 'Notifications';
					isOneToOne: false;
					isSetofReturn: true;
				};
			};
			is_active: { Args: never; Returns: boolean };
			is_admin: { Args: never; Returns: boolean };
		};
		Enums: {
			reservation_category: 'classroom' | 'openwater' | 'pool';
			reservation_status: 'canceled' | 'confirmed' | 'pending' | 'rejected';
			reservation_type:
				| 'autonomous'
				| 'autonomousPlatform'
				| 'autonomousPlatformCBS'
				| 'cbs'
				| 'competitionSetupCBS'
				| 'course'
				| 'proSafety';
			user_privilege: 'normal' | 'admin';
			user_status: 'active' | 'disabled';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
	  }
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
	? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
			Row: infer R;
	  }
		? R
		: never
	: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
	  }
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Insert: infer I;
	  }
		? I
		: never
	: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
	  }
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Update: infer U;
	  }
		? U
		: never
	: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
	? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
	: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
	? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
	: never;

export const Constants = {
	graphql_public: {
		Enums: {}
	},
	public: {
		Enums: {
			reservation_category: ['classroom', 'openwater', 'pool'],
			reservation_status: ['canceled', 'confirmed', 'pending', 'rejected'],
			reservation_type: [
				'autonomous',
				'autonomousPlatform',
				'autonomousPlatformCBS',
				'cbs',
				'competitionSetupCBS',
				'course',
				'proSafety'
			],
			user_privilege: ['normal', 'admin'],
			user_status: ['active', 'disabled']
		}
	}
} as const;
