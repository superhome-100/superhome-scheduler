import { supabase } from '../utils/supabase';
import type { Database } from '../database.types';

type Availability = Database['public']['Tables']['availabilities']['Row'];
type AvailabilityInsert = Database['public']['Tables']['availabilities']['Insert'];
type AvailabilityUpdate = Database['public']['Tables']['availabilities']['Update'];

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  hasOverride: boolean;
}

type DbCategory = Database['public']['Enums']['reservation_type'];

export interface AvailabilityQuery {
  date: string;
  category: DbCategory; // DB enum: 'pool' | 'open_water' | 'classroom'
  type?: string | null; // subtype within category, nullable
}

export class AvailabilityService {
  /**
   * Check if a specific date/type/category is available
   * Default assumption: if not in table, then available
   */
  async checkAvailability(
    date: string,
    category: DbCategory,
    type?: string | null
  ): Promise<AvailabilityCheck> {
    try {
      let query = supabase
        .from('availabilities')
        .select('available, reason')
        .eq('date', date)
        .eq('category', category);
      query = type == null ? query.is('type', null) : query.eq('type', type);
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking availability:', error);
        return { isAvailable: false, hasOverride: false };
      }

      // If no row found, it's available by default
      if (!data) {
        return { isAvailable: true, hasOverride: false };
      }

      return {
        isAvailable: data.available,
        reason: data.reason || undefined,
        hasOverride: true
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return { isAvailable: false, hasOverride: false };
    }
  }

  /**
   * Check availability for multiple date/type combinations
   */
  async checkMultipleAvailabilities(
    queries: AvailabilityQuery[]
  ): Promise<Map<string, AvailabilityCheck>> {
    const results = new Map<string, AvailabilityCheck>();
    
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('date, category, type, available, reason')
        .in('date', queries.map(q => q.date))
        .in('category', queries.map(q => q.category));

      if (error) {
        console.error('Error checking multiple availabilities:', error);
        return results;
      }

      // Create a map of existing overrides
      type AvailabilitySubset = Pick<Availability, 'date' | 'category' | 'type' | 'available' | 'reason'>;
      const overrides = new Map<string, AvailabilitySubset>();
      data?.forEach(override => {
        const key = `${override.date}-${override.category}-${override.type ?? 'null'}`;
        overrides.set(key, override);
      });

      // Check each query
      queries.forEach(query => {
        const key = `${query.date}-${query.category}-${query.type ?? 'null'}`;
        const override = overrides.get(key);
        
        if (override) {
          results.set(key, {
            isAvailable: override.available,
            reason: override.reason || undefined,
            hasOverride: true
          });
        } else {
          results.set(key, {
            isAvailable: true,
            hasOverride: false
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Error checking multiple availabilities:', error);
      return results;
    }
  }

  /**
   * Get next available date for a type/category
   */
  async getNextAvailableDate(
    category: DbCategory,
    type?: string | null,
    fromDate?: string
  ): Promise<string | null> {
    try {
      const startDate = fromDate ? new Date(fromDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // Look ahead 30 days

      let rangeQuery = supabase
        .from('availabilities')
        .select('date, available')
        .eq('category', category);
      rangeQuery = type == null ? rangeQuery.is('type', null) : rangeQuery.eq('type', type);
      const { data, error } = await rangeQuery
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        console.error('Error getting next available date:', error);
        return null;
      }

      // Find first available date
      const unavailableDates = new Set(
        data?.filter(item => !item.available).map(item => item.date) || []
      );

      // Check each date starting from startDate
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!unavailableDates.has(dateStr)) {
          return dateStr;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting next available date:', error);
      return null;
    }
  }

  /**
   * Get availability for a date range
   */
  async getAvailabilityRange(
    startDate: string,
    endDate: string,
    category: DbCategory,
    type?: string | null
  ): Promise<Availability[]> {
    try {
      let rangeAllQuery = supabase
        .from('availabilities')
        .select('*')
        .eq('category', category);
      rangeAllQuery = type == null ? rangeAllQuery.is('type', null) : rangeAllQuery.eq('type', type);
      const { data, error } = await rangeAllQuery
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error getting availability range:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting availability range:', error);
      return [];
    }
  }

  /**
   * Create availability override (admin only)
   */
  async createAvailabilityOverride(
    availability: AvailabilityInsert
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('availabilities')
        .insert(availability);

      if (error) {
        console.error('Error creating availability override:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating availability override:', error);
      return { success: false, error: 'Unknown error occurred' };
    }
  }

  /**
   * Update availability override (admin only)
   */
  async updateAvailabilityOverride(
    id: number,
    updates: AvailabilityUpdate
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('availabilities')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating availability override:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating availability override:', error);
      return { success: false, error: 'Unknown error occurred' };
    }
  }

  /**
   * Delete availability override (admin only)
   */
  async deleteAvailabilityOverride(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting availability override:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting availability override:', error);
      return { success: false, error: 'Unknown error occurred' };
    }
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
