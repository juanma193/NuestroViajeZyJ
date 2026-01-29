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
  private readonly avatarBucket = 'avatars';

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

  async upsertPerfil(perfil: Profile): Promise<Profile | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .upsert(perfil, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Error guardando perfil:', error);
      return null;
    }

    return data as Profile;
  }

  async subirAvatar(userId: string, archivo: File): Promise<string | null> {
    if (!userId) return null;

    const extension = archivo.name.split('.').pop() ?? 'png';
    const base = archivo.name.replace(/\.[^/.]+$/, '');
    const nombreSeguro = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ruta = `${userId}/${Date.now()}-${nombreSeguro}.${extension}`;

    const { error } = await this.supabase.supabase
      .storage
      .from(this.avatarBucket)
      .upload(ruta, archivo, {
        upsert: true,
        cacheControl: '3600',
        contentType: archivo.type || 'image/png',
      });

    if (error) {
      console.error('Error subiendo avatar:', error);
      return null;
    }

    const { data } = this.supabase.supabase
      .storage
      .from(this.avatarBucket)
      .getPublicUrl(ruta);

    return data.publicUrl ?? null;
  }

  async obtenerAvatarUrl(avatarUrl: string): Promise<string> {
    if (!avatarUrl) return '';

    const match = avatarUrl.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?([^/]+)\/(.+)$/);
    if (!match) return avatarUrl;

    const bucket = match[1];
    const ruta = decodeURIComponent(match[2]);

    const { data, error } = await this.supabase.supabase
      .storage
      .from(bucket)
      .createSignedUrl(ruta, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error('Error creando URL firmada:', error);
      return avatarUrl;
    }

    return data.signedUrl;
  }
}
