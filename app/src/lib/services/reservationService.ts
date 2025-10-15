import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { callFunction } from '../utils/functions';
import { supabase } from '../utils/supabase';

// Enforce strict typing for ReservationType and ReservationStatus
export type ReservationType = 'pool' | 'open_water' | 'classroom';
export type ReservationStatus = 'pending' | 'confirmed' | 'rejected';

// Use dependency injection for supabase client for better testability and reusability
// Example: pass supabase client as a parameter to service functions

// Base reservation interface
interface BaseReservation {
  uid: string;
  res_date: string;
  res_type: ReservationType;
  res_status: ReservationStatus;
  created_at?: string;
  updated_at?: string;
}

// Pool reservation details
interface PoolReservationDetails {
  start_time: string | null;
  end_time: string | null;
  lane?: string | null;
  pool_type?: string | null;
  note?: string | null;
}

// Classroom reservation details
interface ClassroomReservationDetails {
  start_time: string | null;
  end_time: string | null;
  room?: string | null;
  classroom_type?: string | null;
  note?: string | null;
}

// Open water reservation details
interface OpenWaterReservationDetails {
  time_period: string | null;
  depth_m?: number | null;
  buoy?: string | null;
  auto_adjust_closest?: boolean;
  pulley?: boolean;
  deep_fim_training?: boolean;
  bottom_plate?: boolean;
  large_buoy?: boolean;
  open_water_type?: string | null;
  student_count?: number | null;
  group_id?: number | null;
  note?: string | null;
}

// Complete reservation with details
interface CompleteReservation extends BaseReservation {
  res_pool?: PoolReservationDetails;
  res_classroom?: ClassroomReservationDetails;
  res_openwater?: OpenWaterReservationDetails;
}

// Create reservation data
interface CreateReservationData {
  res_type: ReservationType;
  res_date: string;
  res_status?: ReservationStatus;
  // Pool details
  pool?: PoolReservationDetails;
  // Classroom details
  classroom?: ClassroomReservationDetails;
  // Open water details
  openwater?: OpenWaterReservationDetails;
}

// Update reservation data
interface UpdateReservationData {
  res_status?: ReservationStatus;
  res_date?: string;
  // Pool details
  pool?: Partial<PoolReservationDetails>;
  // Classroom details
  classroom?: Partial<ClassroomReservationDetails>;
  // Open water details
  openwater?: Partial<OpenWaterReservationDetails>;
}

// Query options
interface ReservationQueryOptions {
  uid?: string;
  res_type?: ReservationType;
  res_status?: ReservationStatus;
  start_date?: string;
  end_date?: string;
  include_details?: boolean;
  order_by?: 'res_date' | 'created_at' | 'updated_at';
  order_direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Service response wrapper
interface ServiceResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

class ReservationService {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient: SupabaseClient<Database> = supabase) {
    this.supabase = supabaseClient;
  }

  /**
   * CREATE - Create a new reservation
   */
  async createReservation(
    uid: string, 
    reservationData: CreateReservationData
  ): Promise<ServiceResponse<CompleteReservation>> {
    try {
      // Basic validation (API layer also validates)
      if (!uid || !reservationData.res_type || !reservationData.res_date) {
        return { success: false, error: 'Missing required fields: uid, res_type, or res_date' };
      }

      const payload = {
        uid,
        res_type: reservationData.res_type,
        res_date: reservationData.res_date,
        res_status: reservationData.res_status,
        pool: reservationData.pool,
        classroom: reservationData.classroom,
        openwater: reservationData.openwater
      };

      const { data, error } = await callFunction<typeof payload, any>('reservations-create', payload);
      if (error) {
        return { success: false, error };
      }

      // Fetch complete reservation using normalized ISO date
      const iso = new Date(reservationData.res_date).toISOString();
      const result = await this.getReservation(uid, iso);
      if (!result.success) return result as ServiceResponse<CompleteReservation>;
      return result as ServiceResponse<CompleteReservation>;

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * READ - Get reservations with optional filtering
   */
  async getReservations(options: ReservationQueryOptions = {}): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      let query = this.supabase
        .from('reservations')
        .select(`
          *,
          res_pool!left(start_time, end_time, lane, pool_type, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, group_id, note),
          res_classroom!left(start_time, end_time, room, classroom_type, note)
        `);

      // Apply filters
      if (options.uid) {
        query = query.eq('uid', options.uid);
      }
      if (options.res_type) {
        query = query.eq('res_type', options.res_type);
      }
      if (options.res_status) {
        query = query.eq('res_status', options.res_status);
      }
      if (options.start_date) {
        query = query.gte('res_date', options.start_date);
      }
      if (options.end_date) {
        query = query.lte('res_date', options.end_date);
      }

      // Apply ordering
      const orderBy = options.order_by || 'res_date';
      const orderDirection = options.order_direction || 'asc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Failed to fetch reservations: ${error.message}`
        };
      }

      return {
        success: true,
        data: (data || []).map((reservation: any) => ({
          ...reservation,
          res_pool: reservation.res_pool || undefined,
          res_classroom: reservation.res_classroom || undefined,
          res_openwater: reservation.res_openwater || undefined
        }))
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * READ - Get a single reservation by uid and res_date
   */
  async getReservation(uid: string, res_date: string): Promise<ServiceResponse<CompleteReservation>> {
    try {
      const { data, error } = await this.supabase
        .from('reservations')
        .select(`
          *,
          res_pool!left(start_time, end_time, lane, pool_type, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, group_id, note),
          res_classroom!left(start_time, end_time, room, classroom_type, note)
        `)
        .eq('uid', uid)
        .eq('res_date', res_date)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to fetch reservation: ${error.message}`
        };
      }

      return {
        success: true,
        data: {
          ...data,
          res_pool: data.res_pool || undefined,
          res_classroom: data.res_classroom || undefined,
          res_openwater: data.res_openwater || undefined
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * UPDATE - Update a reservation
   */
  async updateReservation(
    uid: string,
    res_date: string,
    updateData: UpdateReservationData
  ): Promise<ServiceResponse<CompleteReservation>> {
    try {
      const payload: any = { uid, res_date };
      if (updateData.res_status || updateData.res_date) {
        payload.parent = {
          ...(updateData.res_status ? { res_status: updateData.res_status } : {}),
          ...(updateData.res_date ? { res_date: updateData.res_date } : {})
        };
      }
      if (updateData.pool) payload.pool = updateData.pool;
      if (updateData.classroom) payload.classroom = updateData.classroom;
      if (updateData.openwater) payload.openwater = updateData.openwater;

      const { error } = await callFunction<typeof payload, { ok: boolean }>('reservations-update', payload);
      if (error) {
        return { success: false, error };
      }

      // If res_date changed, fetch by the new PK value
      const fetchDate = updateData.res_date ? new Date(updateData.res_date).toISOString() : res_date;
      return await this.getReservation(uid, fetchDate);

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * DELETE - Delete a reservation
   */
  async deleteReservation(uid: string, res_date: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await callFunction<{ uid: string; res_date: string }, { ok: boolean }>(
        'reservations-delete',
        { uid, res_date }
      );
      if (error) return { success: false, error };
      return { success: true, data: true };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * BULK OPERATIONS
   */

  /**
   * Bulk update reservation statuses
   */
  async bulkUpdateStatus(
    reservations: Array<{ uid: string; res_date: string }>,
    status: ReservationStatus
  ): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await callFunction<
        { reservations: Array<{ uid: string; res_date: string }>; status: ReservationStatus },
        { updated: number; errors?: string[] }
      >('reservations-bulk-status', { reservations, status });

      if (error) {
        return { success: false, error };
      }

      return {
        success: true,
        data: data?.updated ?? 0,
        error: data?.errors && data.errors.length > 0 ? data.errors.join(', ') : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's upcoming reservations
   */
  async getUpcomingReservations(uid: string, limit: number = 10): Promise<ServiceResponse<CompleteReservation[]>> {
    const now = new Date().toISOString();
    return this.getReservations({
      uid,
      start_date: now,
      order_by: 'res_date',
      order_direction: 'asc',
      limit
    });
  }

  /**
   * Get user's past reservations
   */
  async getPastReservations(uid: string, limit: number = 10): Promise<ServiceResponse<CompleteReservation[]>> {
    const now = new Date().toISOString();
    return this.getReservations({
      uid,
      end_date: now,
      order_by: 'res_date',
      order_direction: 'desc',
      limit
    });
  }

  /**
   * Get reservations by status
   */
  async getReservationsByStatus(
    status: ReservationStatus,
    options: Omit<ReservationQueryOptions, 'res_status'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    return this.getReservations({
      ...options,
      res_status: status
    });
  }

  /**
   * Get reservations by type
   */
  async getReservationsByType(
    type: ReservationType,
    options: Omit<ReservationQueryOptions, 'res_type'> = {}
  ): Promise<ServiceResponse<CompleteReservation[]>> {
    return this.getReservations({
      ...options,
      res_type: type
    });
  }
}

// Export singleton instance
export const reservationService = new ReservationService();

// Export types
export type {
  BaseReservation,
  CompleteReservation,
  CreateReservationData,
  UpdateReservationData,
  ReservationQueryOptions,
  ServiceResponse,
  PoolReservationDetails,
  ClassroomReservationDetails,
  OpenWaterReservationDetails
};
