import { supabase } from '../utils/supabase';
import { callFunction } from '../utils/functions';
import type { Buoy, BuoyRequest } from '../types/buoy';

export class BuoyService {
  async getBuoys(): Promise<{ data: Buoy[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('buoy')
      .select('*')
      .order('buoy_name', { ascending: true });
    
    if (error) return { data: null, error: error.message };
    return { data: data as Buoy[], error: null };
  }

  async createBuoy(buoy: Partial<Buoy>): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<Record<string, unknown>, any>(
      'buoy-crud',
      { action: 'create', ...buoy } as Record<string, unknown>
    );
    if (error) return { success: false, error };
    return { success: true };
  }

  async updateBuoy(buoy_name: string, updates: Partial<Buoy> & { new_buoy_name?: string }): Promise<{ success: boolean; error?: string }> {
    // Separate buoy_name (the new potential name) from the other updates
    // if it was accidentally passed in the updates object
    const { buoy_name: _, ...otherUpdates } = updates as any;
    
    const payload = { 
      action: 'update', 
      buoy_name, // original name for lookup
      ...otherUpdates 
    } as Record<string, unknown>;

    const { error } = await callFunction<Record<string, unknown>, any>(
      'buoy-crud',
      payload
    );
    if (error) return { success: false, error };
    return { success: true };
  }

  async deleteBuoy(buoy_name: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<Record<string, unknown>, any>(
      'buoy-crud',
      { action: 'delete', buoy_name } as Record<string, unknown>
    );
    if (error) return { success: false, error };
    return { success: true };
  }
}

export const buoyService = new BuoyService();
