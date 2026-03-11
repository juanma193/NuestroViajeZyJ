import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { LugarPorVisitar } from '../models/lugar-por-visitar.model';
import { ParejasService } from './parejas.service';

@Injectable({
  providedIn: 'root'
})
export class LugaresVisitarService {
  private readonly table = 'lugares_para_visitar';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService
  ) {}

  async getLugares(): Promise<LugarPorVisitar[]> {
    const parejaId = await this.parejasService.getParejaIdActual();
    
    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .select('*')
      .eq('pareja_id', parejaId ?? '')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo lugares:', error);
      return [];
    }

    return data || [];
  }

  async createLugar(lugar: Omit<LugarPorVisitar, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<LugarPorVisitar | null> {
    const parejaId = await this.parejasService.getParejaIdActual();
    const userId = this.supabase.supabase.auth.getUser().then(u => u.data.user?.id);
    
    if (!parejaId) {
      console.error('No hay pareja_id para crear lugar');
      return null;
    }

    const payload = {
      ...lugar,
      pareja_id: parejaId,
      created_by: await userId,
      visitado: lugar.visitado ?? false
    };

    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creando lugar:', error);
      return null;
    }

    return data;
  }

  async updateLugar(id: number, cambios: Partial<LugarPorVisitar>): Promise<LugarPorVisitar | null> {
    const { data, error } = await this.supabase.supabase
      .from(this.table)
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando lugar:', error);
      return null;
    }

    return data;
  }

  async deleteLugar(id: number): Promise<boolean> {
    const { error } = await this.supabase.supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando lugar:', error);
      return false;
    }

    return true;
  }
}
