import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { ProveedorEmprendimiento } from '../models/proveedor-emprendimiento.model';

@Injectable({
  providedIn: 'root',
})
export class ProveedoresEmprendimientoService {
  private readonly table = 'proveedores_emprendimiento';

  constructor(private supabase: SupabaseService, private parejasService: ParejasService) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async getProveedores(parejaId?: string): Promise<ProveedorEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', pid)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error listando proveedores:', error);
        return [];
      }
      return (data as ProveedorEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error listando proveedores:', e);
      return [];
    }
  }

  async getProveedorById(id: number, parejaId?: string): Promise<ProveedorEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo proveedor:', error);
        return null;
      }
      return (data as ProveedorEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error obteniendo proveedor:', e);
      return null;
    }
  }

  async createProveedor(
    payload: Omit<ProveedorEmprendimiento, 'id' | 'created_at' | 'updated_at' | 'pareja_id'>,
  ): Promise<ProveedorEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const record: ProveedorEmprendimiento = {
        ...payload,
        pareja_id: pid,
        activo: payload.activo ?? true,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando proveedor:', error);
        return null;
      }
      return (data as ProveedorEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error creando proveedor:', e);
      return null;
    }
  }

  async updateProveedor(id: number, payload: Partial<ProveedorEmprendimiento>): Promise<ProveedorEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando proveedor:', error);
        return null;
      }
      return (data as ProveedorEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error actualizando proveedor:', e);
      return null;
    }
  }

  async toggleProveedorActivo(id: number, activo: boolean): Promise<boolean> {
    try {
      const pid = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .update({ activo })
        .eq('id', id)
        .eq('pareja_id', pid);

      if (error) {
        console.error('Error actualizando activo proveedor:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error actualizando activo proveedor:', e);
      return false;
    }
  }

  async deleteProveedor(id: number): Promise<boolean> {
    // MVP: desactivar en vez de eliminar.
    return this.toggleProveedorActivo(id, false);
  }
}
