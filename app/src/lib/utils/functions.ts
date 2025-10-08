import { supabase } from './supabase';

export type FunctionInvokeResult<T> = {
  data: T | null;
  error: string | null;
};

export async function callFunction<TReq extends Record<string, unknown>, TRes>(
  name: string,
  payload: TReq
): Promise<FunctionInvokeResult<TRes>> {
  try {
    const { data, error } = await supabase.functions.invoke<TRes>(name, {
      body: payload
    });
    if (error) return { data: null, error: error.message };
    return { data: data ?? null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Edge function call failed';
    return { data: null, error: msg };
  }
}
