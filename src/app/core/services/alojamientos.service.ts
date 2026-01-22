import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { Alojamiento } from '../models/alojamiento.model';

@Injectable({
  providedIn: 'root',
})
export class AlojamientosService {
  private readonly tableName = 'alojamientos';

  constructor(private supabase: SupabaseService) {}

  async obtenerAlojamientosPorViaje(viajeId: number): Promise<Alojamiento[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha_checkin', { ascending: true });

    if (error) {
      console.error('Error obteniendo alojamientos:', error);
      return [];
    }

    return data || [];
  }

  async agregarAlojamiento(alojamiento: Omit<Alojamiento, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).insert([alojamiento]);

    if (error) {
      console.error('Error agregando alojamiento:', error);
      return false;
    }

    return true;
  }

  async actualizarAlojamiento(id: number, cambios: Partial<Alojamiento>): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando alojamiento:', error);
      return false;
    }

    return true;
  }

  async eliminarAlojamiento(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error('Error eliminando alojamiento:', error);
      return false;
    }

    return true;
  }
}
