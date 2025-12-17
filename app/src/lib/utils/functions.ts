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
    // Get the current session to ensure we have a valid token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      return { 
        data: null, 
        error: 'No valid session found. Please log in again.' 
      };
    }

    const { data, error } = await supabase.functions.invoke<TRes>(name, {
      body: payload,
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });
    
    if (error) {
      // Try to extract a more specific error message from the response when available
      const anyErr = error as unknown as {
        message?: string;
        name?: string;
        context?: { body?: any; error?: any; response?: Response; status?: number; statusText?: string };
        status?: number;
        statusText?: string;
        cause?: any;
      };

      let detailed: string | undefined;
      const body = anyErr?.context?.body;
      // Prefer JSON error from context.body
      if (body !== undefined && body !== null) {
        if (typeof body === 'string') {
          // attempt to parse JSON string; otherwise use raw string
          try {
            const parsed = JSON.parse(body);
            // Prefer friendly message when present (server may send error codes like 'duplicate'/'conflict')
            if (typeof parsed?.message === 'string') detailed = parsed.message;
            else if (typeof parsed?.error === 'string') detailed = parsed.error;
          } catch {
            // raw string body (may already be human-readable)
            if (!detailed && body.trim().length > 0) detailed = body.trim();
          }
        } else if (typeof body === 'object') {
          const obj = body as any;
          if (typeof obj?.message === 'string') detailed = obj.message as string;
          else if (typeof obj?.error === 'string') detailed = obj.error as string;
        }
      }
      // Attempt to read from context.response if provided and body wasn't set
      if (!detailed && anyErr?.context?.response) {
        try {
          const resp = anyErr.context.response;
          // Try JSON first via clone
          try {
            const parsed: any = await resp.clone().json();
            if (parsed) {
              if (typeof parsed.message === 'string') detailed = parsed.message;
              else if (typeof parsed.error === 'string') detailed = parsed.error;
              else if (typeof parsed.detail === 'string') detailed = parsed.detail;
            }
          } catch {}
          // Fallback to text if JSON not helpful
          if (!detailed) {
            try {
              const txt = await resp.clone().text();
              if (txt && txt.trim().length > 0) {
                try {
                  const parsed2 = JSON.parse(txt);
                  if (typeof parsed2?.message === 'string') detailed = parsed2.message;
                  else if (typeof parsed2?.error === 'string') detailed = parsed2.error;
                  else if (typeof parsed2?.detail === 'string') detailed = parsed2.detail;
                  else detailed = txt;
                } catch {
                  detailed = txt;
                }
              }
            } catch {}
          }
          // Last resort: statusText
          if (!detailed) {
            const st = (resp as any).statusText as string | undefined;
            if (st && st.trim().length > 0) detailed = st;
          }
        } catch {}
      }
      // Some environments put message under context.error.message or context.error
      if (!detailed && anyErr?.context?.error) {
        const ctxErr = anyErr.context.error as any;
        if (typeof ctxErr?.message === 'string') detailed = ctxErr.message;
        else if (typeof ctxErr?.error === 'string') detailed = ctxErr.error;
        else if (typeof ctxErr === 'string' && ctxErr.trim().length > 0) detailed = ctxErr;
      }
      // Supabase sometimes places details in cause
      if (!detailed && anyErr?.cause) {
        const c = anyErr.cause as any;
        if (typeof c?.message === 'string') detailed = c.message;
        else if (typeof c?.error === 'string') detailed = c.error;
      }
      // In some cases, data may contain the body even for non-2xx
      if (!detailed && data && typeof data === 'object' && (data as any).error) {
        const d = data as any;
        detailed = typeof d.message === 'string' ? d.message : (typeof d.error === 'string' ? d.error : undefined);
      }

      // Fallback: some Supabase environments return only a generic non-2xx message.
      // When that happens and we couldn't extract details from context, re-fetch the function
      // endpoint directly and parse the response body.
      if (!detailed) {
        const msg = (anyErr?.message || error.message || '').toLowerCase();
        const isGenericNon2xx = msg.includes('non-2xx status code');
        if (isGenericNon2xx) {
          try {
            const baseUrl = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL;
            if (typeof baseUrl === 'string' && baseUrl.length > 0) {
              const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/functions/v1/${name}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify(payload),
              });

              // Only try to parse body if the fallback request is non-2xx (expected in this branch)
              if (!resp.ok) {
                try {
                  const parsed: any = await resp.clone().json();
                  if (parsed) {
                    if (typeof parsed.message === 'string') detailed = parsed.message;
                    else if (typeof parsed.error === 'string') detailed = parsed.error;
                  }
                } catch {}

                if (!detailed) {
                  try {
                    const txt = await resp.clone().text();
                    if (txt && txt.trim().length > 0) {
                      try {
                        const parsed2 = JSON.parse(txt);
                        if (typeof parsed2?.message === 'string') detailed = parsed2.message;
                        else if (typeof parsed2?.error === 'string') detailed = parsed2.error;
                        else detailed = txt;
                      } catch {
                        detailed = txt;
                      }
                    }
                  } catch {}
                }
              }
            }
          } catch {}
        }
      }
      return { data: null, error: detailed || error.message };
    }
    return { data: data ?? null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Edge function call failed';
    return { data: null, error: msg };
  }
}
