import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { Vuelo } from '../models/vuelo.model';

@Injectable({
  providedIn: 'root',
})
export class VuelosService {
  private readonly tableName = 'vuelos';

  constructor(private supabase: SupabaseService) {}

  async obtenerVuelosPorViaje(viajeId: number): Promise<Vuelo[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('viaje_id', viajeId)
      .order('fecha_salida', { ascending: true });

    if (error) {
      console.error('Error obteniendo vuelos:', error);
      return [];
    }

    return data || [];
  }

  async agregarVuelo(vuelo: Omit<Vuelo, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).insert([vuelo]);

    if (error) {
      console.error('Error agregando vuelo:', error);
      return false;
    }

    return true;
  }

  async actualizarVuelo(id: number, cambios: Partial<Vuelo>): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando vuelo:', error);
      return false;
    }

    return true;
  }

  async eliminarVuelo(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error('Error eliminando vuelo:', error);
      return false;
    }

    return true;
  }
}
