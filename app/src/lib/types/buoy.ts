export interface Buoy {
  buoy_name: string;
  max_depth: number;
  pulley: boolean;
  bottom_plate: boolean;
  large_buoy: boolean;
  deep_fim_training: boolean;
  created_at?: string;
  updated_at?: string;
}

export type BuoyAction = 'create' | 'update' | 'delete' | 'get';

export interface BuoyRequest {
  action: BuoyAction;
  buoy_name?: string;
  new_buoy_name?: string;
  max_depth?: number;
  pulley?: boolean;
  bottom_plate?: boolean;
  large_buoy?: boolean;
  deep_fim_training?: boolean;
}
