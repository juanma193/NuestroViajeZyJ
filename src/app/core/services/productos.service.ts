import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { Producto } from '../models/producto.model';

export interface ListarProductosParams {
  buscar?: string;
  incluir_inactivos?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private readonly table = 'productos';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
  ) {}

  private stripUnknownColumnFromPayload(
    payload: Record<string, any>,
    error: any,
  ): { payload: Record<string, any>; removed?: string } {
    const message = String(error?.message ?? '');
    const match = message.match(/Could not find the '([^']+)' column/);
    const column = match?.[1];
    if (!column) return { payload };

    if (!(column in payload)) return { payload };

    const next = { ...payload };
    delete next[column];
    return { payload: next, removed: column };
  }

  private async requireParejaId(): Promise<string> {
    const parejaId = await this.parejasService.getParejaIdActual();
    if (!parejaId) throw new Error('No se encontró una pareja activa.');
    return parejaId;
  }

  async listar(params: ListarProductosParams = {}): Promise<Producto[]> {
    try {
      const parejaId = await this.requireParejaId();
      let q = this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', parejaId)
        .order('nombre', { ascending: true });

      const buscar = (params.buscar ?? '').trim();
      if (buscar) {
        q = q.ilike('nombre', `%${buscar}%`);
      }

      if (!params.incluir_inactivos) {
        q = q.eq('activo', true);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error listando productos:', error);
        return [];
      }

      return (data as Producto[]) ?? [];
    } catch (e) {
      console.error('Error listando productos:', e);
      return [];
    }
  }

  async obtenerPorId(id: number): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', parejaId)
        .single();

      if (error) {
        console.error('Error obteniendo producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error obteniendo producto:', e);
      return null;
    }
  }

  async crear(payload: Omit<Producto, 'id' | 'pareja_id'>): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();
      const record: Producto = {
        ...payload,
        pareja_id: parejaId,
        margen_porcentaje: Math.max(0, payload.margen_porcentaje ?? 0),
      };

      const attempt = async (row: any) =>
        this.supabase.supabase.from(this.table).insert([row]).select('*').single();

      let { data, error } = await attempt(record);
      if (error?.code === 'PGRST204') {
        const stripped = this.stripUnknownColumnFromPayload(record as any, error);
        if (stripped.removed) {
          console.warn(
            `Columna inexistente en '${this.table}': '${stripped.removed}'. Reintentando insert sin ese campo.`,
          );
          ({ data, error } = await attempt(stripped.payload));
        }
      }

      if (error) {
        console.error('Error creando producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error creando producto:', e);
      return null;
    }
  }

  async actualizar(id: number, cambios: Partial<Producto>): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();

      const payload: any = { ...cambios };
      if (payload.margen_porcentaje != null) {
        payload.margen_porcentaje = Math.max(0, Number(payload.margen_porcentaje));
      }

      const attempt = async (pl: any) =>
        this.supabase.supabase
          .from(this.table)
          .update(pl)
          .eq('id', id)
          .eq('pareja_id', parejaId)
          .select('*')
          .single();

      let { data, error } = await attempt(payload);

      if (error?.code === 'PGRST204') {
        const stripped = this.stripUnknownColumnFromPayload(payload, error);
        if (stripped.removed) {
          console.warn(
            `Columna inexistente en '${this.table}': '${stripped.removed}'. Reintentando update sin ese campo.`,
          );
          ({ data, error } = await attempt(stripped.payload));
        }
      }

      if (error) {
        console.error('Error actualizando producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error actualizando producto:', e);
      return null;
    }
  }

  async setActivo(id: number, activo: boolean): Promise<boolean> {
    try {
      const parejaId = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .update({ activo })
        .eq('id', id)
        .eq('pareja_id', parejaId);

      if (error) {
        console.error('Error actualizando activo de producto:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error actualizando activo de producto:', e);
      return false;
    }
  }

  async actualizarCostos(
    id: number,
    costos: { costo_calculado: number; precio_sugerido: number },
  ): Promise<boolean> {
    try {
      const parejaId = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .update({
          costo_calculado: costos.costo_calculado,
          precio_sugerido: costos.precio_sugerido,
        })
        .eq('id', id)
        .eq('pareja_id', parejaId);

      if (error) {
        console.error('Error guardando costos de producto:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error guardando costos de producto:', e);
      return false;
    }
  }
}
