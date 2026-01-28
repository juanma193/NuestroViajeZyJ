import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { CosaParaLlevar } from '../models/cosa-para-llevar.model';

@Injectable({
  providedIn: 'root',
})
export class CosasParaLlevarService {
  private readonly tableName = 'cosas_para_llevar';

  constructor(private supabase: SupabaseService) {}

  async obtenerCosasPorViaje(viajeId: number): Promise<CosaParaLlevar[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('viaje_id', viajeId)
      .order('created_at', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error obteniendo cosas para llevar:', error);
      return [];
    }

    return data || [];
  }

  async agregarCosa(cosa: Omit<CosaParaLlevar, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).insert([cosa]);

    if (error) {
      console.error('Error agregando cosa para llevar:', error);
      return false;
    }

    return true;
  }

  async actualizarCosa(id: number, cambios: Partial<CosaParaLlevar>): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando cosa para llevar:', error);
      return false;
    }

    return true;
  }

  async eliminarCosa(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error('Error eliminando cosa para llevar:', error);
      return false;
    }

    return true;
  }
}
