import { callFunction } from '../utils/functions';

export type AdminStatus = 'active' | 'disabled' | string;

export class UserAdminService {
  async updateStatus(uid: string, status: AdminStatus): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<{ uid: string; status: AdminStatus }, { ok: boolean }>(
      'user-update-status',
      { uid, status }
    );
    if (error) return { success: false, error };
    return { success: true };
  }

  async updatePrivileges(uid: string, privileges: string[]): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<{ uid: string; privileges: string[] }, { ok: boolean }>(
      'user-update-privileges',
      { uid, privileges }
    );
    if (error) return { success: false, error };
    return { success: true };
  }
}

export const userAdminService = new UserAdminService();
