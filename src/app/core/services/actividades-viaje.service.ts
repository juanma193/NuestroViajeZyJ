import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ActividadViaje } from '../models/actividad-viaje.model';

@Injectable({
  providedIn: 'root',
})
export class ActividadesViajeService {
  private readonly tableName = 'actividades_viaje';

  constructor(private supabase: SupabaseService) {}

  async obtenerActividadesPorViaje(viajeId: number): Promise<ActividadViaje[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error obteniendo actividades:', error);
      return [];
    }

    return data || [];
  }

  async agregarActividad(actividad: Omit<ActividadViaje, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).insert([actividad]);

    if (error) {
      console.error('Error agregando actividad:', error);
      return false;
    }

    return true;
  }

  async actualizarActividad(id: number, cambios: Partial<ActividadViaje>): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando actividad:', error);
      return false;
    }

    return true;
  }

  async eliminarActividad(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error('Error eliminando actividad:', error);
      return false;
    }

    return true;
  }
}
