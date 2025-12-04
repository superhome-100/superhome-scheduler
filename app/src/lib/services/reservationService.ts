import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { callFunction } from '../utils/functions';
import { supabase } from '../utils/supabase';

// Enforce strict typing using generated enums from Database
export type ReservationType = Database['public']['Enums']['reservation_type'];
export type ReservationStatus = Database['public']['Enums']['reservation_status'] | 'cancelled';

// Use dependency injection for supabase client for better testability and reusability
// Example: pass supabase client as a parameter to service functions

// Base reservation interface
interface BaseReservation {
  // Surrogate primary key
  reservation_id: number;
  // Logical owner/time key (still unique per user+timestamp)
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
  student_count?: number | null;
  note?: string | null;
}

// Classroom reservation details
interface ClassroomReservationDetails {
  start_time: string | null;
  end_time: string | null;
  room?: string | null;
  classroom_type?: string | null;
  student_count?: number | null;
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
  // Optional buddy UIDs to attach to this reservation
  buddies?: string[];
}

// Update reservation data
interface UpdateReservationData {
  res_status?: ReservationStatus;
  res_date?: string;
  price?: number;
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
        openwater: reservationData.openwater,
        buddies: (reservationData as any).buddies // Pass through buddy UIDs
      };

      const { data, error } = await callFunction<typeof payload, any>('reservations-create', payload);
      if (error) {
        // When reservations-create returns an error, attempt to detect a duplicate reservation
        // Broaden trigger: generic non-2xx, 'Bad Request', or any error string (we’ll no-op if not duplicate)
        const shouldProbeDuplicate = /non-2xx status code/i.test(error) || /Edge Function/i.test(error) || /bad request/i.test(error) || true;
        if (shouldProbeDuplicate) {
          // Duplicate detection for same-type same-time on same date
          const dateOnly = new Date(reservationData.res_date).toISOString().split('T')[0];
          const from = `${dateOnly}T00:00:00.000Z`;
          const to = `${dateOnly}T23:59:59.999Z`;

          const resType = reservationData.res_type;
          const normalizeTime = (raw: string | null | undefined): string | null => {
            if (!raw) return null;
            const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
            if (!m) return null;
            const hh = m[1].padStart(2, '0');
            const mm = m[2];
            return `${hh}:${mm}`;
          };
          const candidateTime = (() => {
            if (resType === 'open_water') {
              const tp = (reservationData.openwater?.time_period || 'AM').toUpperCase();
              return tp === 'PM' ? '13:00' : '08:00';
            }
            if (resType === 'pool') return normalizeTime(reservationData.pool?.start_time);
            if (resType === 'classroom') return normalizeTime(reservationData.classroom?.start_time);
            return null;
          })();

          if (candidateTime) {
            // Query same user, same type, same day, pending/confirmed
            const { data: existing, error: qErr } = await this.supabase
              .from('reservations')
              .select(`
                res_type,
                res_openwater(time_period, open_water_type),
                res_pool(start_time, pool_type),
                res_classroom(start_time, classroom_type)
              `)
              .eq('uid', uid)
              .eq('res_type', resType)
              .in('res_status', ['pending', 'confirmed'])
              .gte('res_date', from)
              .lte('res_date', to);

            if (!qErr) {
              const timeOf = (r: any): string | null => {
                if (r.res_type === 'open_water') {
                  const tp = (r?.res_openwater?.time_period || 'AM').toUpperCase();
                  return tp === 'PM' ? '13:00' : '08:00';
                }
                if (r.res_type === 'pool') return normalizeTime(r?.res_pool?.start_time ?? null);
                if (r.res_type === 'classroom') return normalizeTime(r?.res_classroom?.start_time ?? null);
                return null;
              };
              const dup = (existing || []).find((r: any) => {
                const t = timeOf(r);
                return !!t && t === candidateTime;
              });
              if (dup) {
                const pretty = (s: string | null | undefined) => {
                  if (!s) return null;
                  const x = String(s).toLowerCase();
                  if (x === 'course_coaching') return 'Course/Coaching';
                  return x.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
                };
                const category = dup.res_type === 'open_water' ? 'Open Water' : (dup.res_type === 'pool' ? 'Pool' : (dup.res_type === 'classroom' ? 'Classroom' : 'Reservation'));
                // Prefer DB subtype, fallback to submitted data
                const fallbackSubtype = (() => {
                  if (dup.res_type === 'open_water') return pretty(reservationData.openwater?.open_water_type);
                  if (dup.res_type === 'pool') return pretty(reservationData.pool?.pool_type);
                  if (dup.res_type === 'classroom') return pretty(reservationData.classroom?.classroom_type);
                  return null;
                })();
                const dbSubtype = dup.res_type === 'open_water' ? pretty(dup?.res_openwater?.open_water_type) : (dup.res_type === 'pool' ? pretty(dup?.res_pool?.pool_type) : (dup.res_type === 'classroom' ? pretty(dup?.res_classroom?.classroom_type) : null));
                const subtype = dbSubtype ?? fallbackSubtype;
                const typeLabel = subtype ? `${category} ${subtype}` : category;

                const dateObj = new Date(reservationData.res_date);
                const datePart = dateObj.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                // Format time: Open Water uses AM/PM period; Pool/Classroom use numeric time (no timezone shifting)
                let timeLabel: string;
                if (dup.res_type === 'open_water') {
                  const tp = (reservationData.openwater?.time_period || dup?.res_openwater?.time_period || 'AM').toUpperCase();
                  timeLabel = tp === 'PM' ? 'PM' : 'AM';
                } else {
                  const [h, m] = candidateTime.split(':').map((n) => parseInt(n, 10));
                  const h12 = ((h + 11) % 12) + 1;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const mm = String(m).padStart(2, '0');
                  timeLabel = `${h12}:${mm} ${ampm}`;
                }

                return { success: false, error: `Already have a reservation for ${typeLabel} on ${datePart} at ${timeLabel}.` };
              }
              // If no same-type duplicate, attempt cross-type conflict detection
              const { data: others, error: otherErr } = await this.supabase
                .from('reservations')
                .select(`
                  res_type,
                  res_openwater(time_period, open_water_type),
                  res_pool(start_time, pool_type),
                  res_classroom(start_time, classroom_type)
                `)
                .eq('uid', uid)
                .neq('res_type', resType)
                .in('res_status', ['pending', 'confirmed'])
                .gte('res_date', from)
                .lte('res_date', to);
              if (!otherErr) {
                const conflict = (others || []).find((r: any) => {
                  const t = timeOf(r);
                  return !!t && t === candidateTime;
                });
                if (conflict) {
                  const pretty = (s: string | null | undefined) => {
                    if (!s) return null;
                    const x = String(s).toLowerCase();
                    if (x === 'course_coaching') return 'Course/Coaching';
                    return x.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
                  };
                  const category = conflict.res_type === 'open_water' ? 'Open Water' : (conflict.res_type === 'pool' ? 'Pool' : (conflict.res_type === 'classroom' ? 'Classroom' : 'Reservation'));
                  const subtype = conflict.res_type === 'open_water' ? pretty(conflict?.res_openwater?.open_water_type) : (conflict.res_type === 'pool' ? pretty(conflict?.res_pool?.pool_type) : (conflict.res_type === 'classroom' ? pretty(conflict?.res_classroom?.classroom_type) : null));
                  const typeLabel = subtype ? `${category} ${subtype}` : category;
                  const dateObj = new Date(reservationData.res_date);
                  const datePart = dateObj.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                  let timeLabel: string;
                  if (conflict.res_type === 'open_water') {
                    const tp = (conflict?.res_openwater?.time_period || 'AM').toUpperCase();
                    timeLabel = tp === 'PM' ? 'PM' : 'AM';
                  } else {
                    const [h, m] = candidateTime.split(':').map((n) => parseInt(n, 10));
                    const h12 = ((h + 11) % 12) + 1;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const mm = String(m).padStart(2, '0');
                    timeLabel = `${h12}:${mm} ${ampm}`;
                  }
                  return { success: false, error: `Already have a reservation for ${typeLabel} on ${datePart} at ${timeLabel}.` };
                }
              }
            }
          }
        }
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
   * APPROVE - Approve a classroom reservation (server validates and auto-assigns room)
   */
  async approveReservation(
    uid: string,
    res_date: string
  ): Promise<ServiceResponse<{ ok: boolean; room?: string }>> {
    try {
      if (!uid || !res_date) return { success: false, error: 'Missing uid or res_date' };
      const payload = { uid, res_date };
      const { data, error } = await callFunction<typeof payload, { ok: boolean; room?: string }>('reservations-approve', payload);
      if (error) return { success: false, error };
      return { success: true, data: data ?? { ok: true } };
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
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, group_id, note),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)
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
          res_pool!left(start_time, end_time, lane, pool_type, student_count, note),
          res_openwater!left(time_period, depth_m, buoy, pulley, deep_fim_training, bottom_plate, large_buoy, open_water_type, student_count, group_id, note),
          res_classroom!left(start_time, end_time, room, classroom_type, student_count, note)
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
      if (updateData.res_status || updateData.res_date || typeof updateData.price === 'number') {
        payload.parent = {
          ...(updateData.res_status ? { res_status: updateData.res_status as any } : {}),
          ...(updateData.res_date ? { res_date: updateData.res_date } : {}),
          ...(typeof updateData.price === 'number' ? { price: updateData.price } : {})
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
    status: Exclude<ReservationStatus, 'cancelled'>
  ): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await callFunction<
        { reservations: Array<{ uid: string; res_date: string }>; status: Exclude<ReservationStatus, 'cancelled'> },
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
