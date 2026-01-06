import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { Viaje } from '../models/viaje.model';

@Injectable({
  providedIn: 'root'
})
export class ViajesService {
  private readonly tableName = 'Viajes';

  constructor(private supabase: SupabaseService) {}

  async obtenerViajes(): Promise<Viaje[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo viajes:', error);
      return [];
    }

    return data || [];
  }

  async agregarViaje(viaje: Omit<Viaje, 'id' | 'created_at'>): Promise<Viaje | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .insert([viaje])
      .select()
      .single();

    if (error) {
      console.error('Error agregando viaje:', error);
      return null;
    }

    return data;
  }

  async actualizarViaje(id: number, cambios: Partial<Viaje>): Promise<Viaje | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando viaje:', error);
      return null;
    }

    return data;
  }

  async eliminarViaje(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando viaje:', error);
      return false;
    }

    return true;
  }
}
