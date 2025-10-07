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
  note?: string | null;
}

// Classroom reservation details
interface ClassroomReservationDetails {
  start_time: string | null;
  end_time: string | null;
  room?: string | null;
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
      if (!uid || !reservationData.res_type || !reservationData.res_date) {
        return { success: false, error: 'Missing required fields: uid, res_type, or res_date' };
      }

      const reservationDate = new Date(reservationData.res_date);
      if (reservationDate <= new Date()) {
        return { success: false, error: 'Reservation date must be in the future' };
      }

      const res_date_iso = reservationDate.toISOString();

      const { data, error } = await callFunction<
        {
          uid: string;
          res_type: ReservationType;
          res_date: string;
          res_status?: ReservationStatus;
          pool?: Record<string, unknown>;
          classroom?: Record<string, unknown>;
          openwater?: Record<string, unknown>;
        },
        any
      >('reservations-create', {
        uid,
        res_type: reservationData.res_type,
        res_date: res_date_iso,
        res_status: reservationData.res_status,
        pool: reservationData.pool as any,
        classroom: reservationData.classroom as any,
        openwater: reservationData.openwater as any
      });

      if (error) {
        return { success: false, error };
      }

      // Fetch complete record (with details)
      const fetched = await this.getReservation(uid, res_date_iso);
      return fetched;

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * READ - Get reservations with optional filtering
   */
  async getReservations(options: ReservationQueryOptions = {}): Promise<ServiceResponse<CompleteReservation[]>> {
    try {
      const payload = { ...options, include_details: true } as Record<string, unknown>;
      const { data, error } = await callFunction<Record<string, unknown>, CompleteReservation[]>(
        'reservations-get',
        payload
      );
      if (error) return { success: false, error };
      return { success: true, data: (data || []) as CompleteReservation[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * READ - Get a single reservation by uid and res_date
   */
  async getReservation(uid: string, res_date: string): Promise<ServiceResponse<CompleteReservation>> {
    try {
      const { data, error } = await callFunction<
        { single: { uid: string; res_date: string }; include_details?: boolean },
        any
      >('reservations-get', { single: { uid, res_date }, include_details: true });
      if (error) return { success: false, error };
      return { success: true, data: data as CompleteReservation };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
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
      const payload: any = {
        uid,
        res_date,
        parent: {
          res_status: updateData.res_status,
          res_date: updateData.res_date
        },
        pool: updateData.pool,
        classroom: updateData.classroom,
        openwater: updateData.openwater
      };

      const { error } = await callFunction<typeof payload, { ok: boolean }>('reservations-update', payload);
      if (error) return { success: false, error };

      const updatedReservation = await this.getReservation(uid, updateData.res_date || res_date);
      return updatedReservation;

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
