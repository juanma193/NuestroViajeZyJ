import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';

export interface Profile {
  id: string;
  nombre?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfilesService {
  private readonly tableName = 'profiles';

  constructor(private supabase: SupabaseService) {}

  async obtenerPerfil(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }

    return data as Profile;
  }

  async upsertPerfil(perfil: Profile): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .upsert([perfil]);

    if (error) {
      console.error('Error guardando perfil:', error);
      return false;
    }

    return true;
  }
}
