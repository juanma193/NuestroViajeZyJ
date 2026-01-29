import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { Tarea } from '../models/tarea.model';
import { CategoriaTarea } from '../models/categoria-tarea.model';
import { ParejasService } from './parejas.service';

@Injectable({
  providedIn: 'root'
})
export class TareasService {
  private readonly table = 'tareas';
  private readonly tableCategorias = 'categorias_tareas';

  constructor(private supabase: SupabaseService, private parejasService: ParejasService) {}

  async obtenerTareas(): Promise<Tarea[]> {
    const parejaId = await this.parejasService.getParejaIdActual();
    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .select('*')
      .eq('pareja_id', parejaId ?? '')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error obteniendo tareas:', error);
      return [];
    }

    return data || [];
  }

  async obtenerCategorias(): Promise<CategoriaTarea[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableCategorias)
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }

    return data || [];
  }

  async agregarTarea(tarea: Omit<Tarea, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<Tarea | null> {
    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) {
      console.error('No hay pareja_id para crear tarea');
      return null;
    }

    const payload: any = { ...tarea };
    payload.pareja_id = parejaId;
    // Supabase/Postgres date columns cannot accept empty string. Normalize empty dates to null.
    if (payload.fecha_vencimiento === '') {
      payload.fecha_vencimiento = null;
    }

    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error agregando tarea:', error);
      return null;
    }

    return data;
  }

  async actualizarTarea(id: number, cambios: Partial<Tarea>): Promise<Tarea | null> {
    const payload: any = { ...cambios };
    if (payload.fecha_vencimiento === '') {
      payload.fecha_vencimiento = null;
    }

    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando tarea:', error);
      return null;
    }

    return data;
  }

  async eliminarTarea(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando tarea:', error);
      return false;
    }

    return true;
  }
}
