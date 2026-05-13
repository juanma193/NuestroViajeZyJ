import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { CategoriaMaterial } from '../models/categoria-material.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriasMaterialesService {
  private readonly table = 'categorias_materiales';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
  ) {}

  private async requireParejaId(): Promise<string> {
    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) throw new Error('No se encontró una pareja activa.');
    return parejaId;
  }

  async listar(): Promise<CategoriaMaterial[]> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', parejaId)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error listando categorías de materiales:', error);
        return [];
      }

      return (data as CategoriaMaterial[]) ?? [];
    } catch (e) {
      console.error('Error listando categorías de materiales:', e);
      return [];
    }
  }

  async crear(
    payload: Omit<CategoriaMaterial, 'id' | 'pareja_id'>,
  ): Promise<CategoriaMaterial | null> {
    try {
      const parejaId = await this.requireParejaId();

      const insertPayload: any = {
        pareja_id: parejaId,
        nombre: payload.nombre,
        // La tabla usa 'descripcion' (no 'description')
        descripcion: (payload as any).descripcion ?? (payload as any).description ?? null,
        activo: payload.activo ?? true,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .insert([insertPayload])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando categoría de materiales:', error);
        return null;
      }

      return (data as CategoriaMaterial) ?? null;
    } catch (e) {
      console.error('Error creando categoría de materiales:', e);
      return null;
    }
  }

  async actualizar(
    id: number,
    cambios: Partial<CategoriaMaterial>,
  ): Promise<CategoriaMaterial | null> {
    try {
      const parejaId = await this.requireParejaId();

      const updatePayload: any = {
        nombre: cambios.nombre,
        descripcion: (cambios as any).descripcion ?? (cambios as any).description,
        activo: cambios.activo,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update(updatePayload)
        .eq('id', id)
        .eq('pareja_id', parejaId)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando categoría de materiales:', error);
        return null;
      }

      return (data as CategoriaMaterial) ?? null;
    } catch (e) {
      console.error('Error actualizando categoría de materiales:', e);
      return null;
    }
  }

  async eliminar(id: number): Promise<boolean> {
    try {
      const parejaId = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .delete()
        .eq('id', id)
        .eq('pareja_id', parejaId);

      if (error) {
        console.error('Error eliminando categoría de materiales:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error eliminando categoría de materiales:', e);
      return false;
    }
  }
}
