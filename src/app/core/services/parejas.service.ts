import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class ParejasService {
  private cachedParejaId: string | null = null;

  constructor(private supabase: SupabaseService) {}

  async getParejaIdActual(): Promise<string | null> {
    if (this.cachedParejaId) {
      return this.cachedParejaId;
    }

    const { data: userData, error: userError } = await this.supabase.supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('Error obteniendo usuario para pareja:', userError);
      return null;
    }

    const { data, error } = await this.supabase.supabase
      .from('pareja_miembros')
      .select('pareja_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo pareja_id:', error);
      return null;
    }

    this.cachedParejaId = data?.pareja_id ?? null;
    return this.cachedParejaId;
  }

  limpiarCache() {
    this.cachedParejaId = null;
  }
}
