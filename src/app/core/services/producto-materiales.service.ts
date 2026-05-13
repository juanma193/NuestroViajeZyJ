import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { ProductoMaterial } from '../models/producto-material.model';

@Injectable({
  providedIn: 'root',
})
export class ProductoMaterialesService {
  private readonly table = 'producto_materiales';

  constructor(private supabase: SupabaseService, private parejasService: ParejasService) {}

  private async requireParejaId(): Promise<string> {
    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) throw new Error('No se encontró una pareja activa.');
    return parejaId;
  }

  async listarPorProducto(producto_id: number): Promise<ProductoMaterial[]> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', parejaId)
        .eq('producto_id', producto_id)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error listando receta:', error);
        return [];
      }

      return (data as ProductoMaterial[]) ?? [];
    } catch (e) {
      console.error('Error listando receta:', e);
      return [];
    }
  }

  async agregar(payload: Omit<ProductoMaterial, 'id' | 'pareja_id'>): Promise<ProductoMaterial | null> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .insert([{ ...payload, pareja_id: parejaId }])
        .select('*')
        .single();

      if (error) {
        console.error('Error agregando material a producto:', error);
        return null;
      }

      return (data as ProductoMaterial) ?? null;
    } catch (e) {
      console.error('Error agregando material a producto:', e);
      return null;
    }
  }

  async actualizar(id: number, cambios: Partial<ProductoMaterial>): Promise<ProductoMaterial | null> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update({ ...cambios })
        .eq('id', id)
        .eq('pareja_id', parejaId)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando receta:', error);
        return null;
      }

      return (data as ProductoMaterial) ?? null;
    } catch (e) {
      console.error('Error actualizando receta:', e);
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
        console.error('Error eliminando item de receta:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error eliminando item de receta:', e);
      return false;
    }
  }
}
