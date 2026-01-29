import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { Pelicula } from '../models/pelicula.model';
import { ParejasService } from './parejas.service';

@Injectable({
  providedIn: 'root'
})
export class PeliculasService {
  private readonly tableName = 'Peliculas';

  constructor(private supabase: SupabaseService, private parejasService: ParejasService) {}

  async obtenerPeliculas(): Promise<Pelicula[]> {
    const parejaId = await this.parejasService.getParejaIdActual();
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('*')
      .eq('pareja_id', parejaId ?? '')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo películas:', error);
      return [];
    }

    return data || [];
  }

  async agregarPelicula(pelicula: Omit<Pelicula, 'id' | 'created_at'>): Promise<Pelicula | null> {
    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) {
      console.error('No hay pareja_id para crear pelicula');
      return null;
    }

    const payload = { ...pelicula, pareja_id: parejaId };
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error agregando película:', error);
      return null;
    }

    return data;
  }

  async actualizarPelicula(id: number, cambios: Partial<Pelicula>): Promise<Pelicula | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando película:', error);
      return null;
    }

    return data;
  }

  async eliminarPelicula(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando película:', error);
      return false;
    }

    return true;
  }
}
