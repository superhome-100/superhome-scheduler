// Price Templates API: reads via Supabase, writes via Edge Function
// Tables: public.price_templates, public.price_template_updates
// Mutations: through Edge Function 'price-templates-crud'

import dayjs from 'dayjs';
import { callFunction } from '../utils/functions';
import { supabase } from '../utils/supabase';

export type PriceTemplateName = string;

export type PriceTemplate = {
  name: string;
  description: string | null;
  created_at: string;
};

export type PriceTemplateUpdate = {
  id: string;
  price_template_name: string;
  coach_ow: number;
  coach_pool: number;
  coach_classroom: number;
  auto_ow: number;
  auto_pool: number;
  platform_ow: number;
  platformcbs_ow: number;
  created_at: string;
};

export type CreateUpdatePayload = Omit<PriceTemplateUpdate, 'id' | 'created_at'> & {
  id?: string; // present for update
};

class PriceTemplatesApi {
  async listTemplates(): Promise<{ success: boolean; data: PriceTemplate[]; error?: string }> {
    const [templatesResult, updatesResult] = await Promise.all([
      supabase
        .from('price_templates')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('price_template_updates')
        .select('price_template_name')
    ]);

    if (templatesResult.error) {
      return { success: false, data: [], error: templatesResult.error.message };
    }

    if (updatesResult.error) {
      return { success: false, data: [], error: updatesResult.error.message };
    }

    const activeNames = new Set(
      (updatesResult.data ?? []).map((u) => u.price_template_name as string)
    );

    const filtered = (templatesResult.data ?? []).filter((t) =>
      activeNames.has((t as PriceTemplate).name)
    ) as PriceTemplate[];

    return { success: true, data: filtered };
  }

  async listUpdates(): Promise<{ success: boolean; data: PriceTemplateUpdate[]; error?: string }> {
    const { data, error } = await supabase
      .from('price_template_updates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { success: false, data: [], error: error.message };
    return { success: true, data: (data ?? []) as PriceTemplateUpdate[] };
  }

  async create(payload: CreateUpdatePayload): Promise<{ success: boolean; data?: PriceTemplateUpdate; error?: string }> {
    const body = {
      action: 'create' as const,
      price_template_name: payload.price_template_name,
      coach_ow: Number(payload.coach_ow),
      coach_pool: Number(payload.coach_pool),
      coach_classroom: Number(payload.coach_classroom),
      auto_ow: Number(payload.auto_ow),
      auto_pool: Number(payload.auto_pool),
      platform_ow: Number(payload.platform_ow),
      platformcbs_ow: Number(payload.platformcbs_ow)
    };
    const { data, error } = await callFunction<typeof body, { data: PriceTemplateUpdate }>('price-templates-crud', body);
    if (error) return { success: false, error };
    return { success: true, data: data?.data };
  }

  async update(payload: CreateUpdatePayload): Promise<{ success: boolean; data?: PriceTemplateUpdate; error?: string }> {
    if (!payload.id) return { success: false, error: 'Missing id for update' };
    const body = {
      action: 'update' as const,
      id: payload.id,
      price_template_name: payload.price_template_name,
      coach_ow: Number(payload.coach_ow),
      coach_pool: Number(payload.coach_pool),
      coach_classroom: Number(payload.coach_classroom),
      auto_ow: Number(payload.auto_ow),
      auto_pool: Number(payload.auto_pool),
      platform_ow: Number(payload.platform_ow),
      platformcbs_ow: Number(payload.platformcbs_ow)
    };
    const { data, error } = await callFunction<typeof body, { data: PriceTemplateUpdate }>('price-templates-crud', body);
    if (error) return { success: false, error };
    return { success: true, data: data?.data };
  }

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<{ action: 'delete'; id: string }, { success: boolean }>('price-templates-crud', {
      action: 'delete',
      id
    });
    if (error) return { success: false, error };
    return { success: true };
  }
}

export const priceTemplatesApi = new PriceTemplatesApi();
