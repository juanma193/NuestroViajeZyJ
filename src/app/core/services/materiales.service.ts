import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { Material } from '../models/material.model';
import { EmprendimientoCostosService } from './emprendimiento-costos.service';
import { getEstadoStock } from './emprendimiento-stock.helpers';
import type { ResultadoStockMaterial } from '../models/movimiento-stock.model';

export interface ListarMaterialesParams {
  categoria_id?: number | 'todas';
  buscar?: string;
  incluir_inactivos?: boolean;
  pareja_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MaterialesService {
  private readonly table = 'materiales';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
    private costos: EmprendimientoCostosService,
  ) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async listar(params: ListarMaterialesParams = {}): Promise<Material[]> {
    try {
      const parejaId = await this.requireParejaId(params.pareja_id);
      let q = this.supabase.supabase
        .from(this.table)
        .select('*, proveedor_rel:proveedores_emprendimiento(*)')
        .eq('pareja_id', parejaId)
        .order('nombre', { ascending: true });

      if (params.categoria_id && params.categoria_id !== 'todas') {
        q = q.eq('categoria_id', params.categoria_id);
      }

      const buscar = (params.buscar ?? '').trim();
      if (buscar) {
        q = q.ilike('nombre', `%${buscar}%`);
      }

      if (!params.incluir_inactivos) {
        q = q.eq('activo', true);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error listando materiales:', error);
        return [];
      }

      return (data as Material[]) ?? [];
    } catch (e) {
      console.error('Error listando materiales:', e);
      return [];
    }
  }

  async obtenerPorId(id: number, parejaId?: string): Promise<Material | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*, proveedor_rel:proveedores_emprendimiento(*)')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo material:', error);
        return null;
      }

      return (data as Material) ?? null;
    } catch (e) {
      console.error('Error obteniendo material:', e);
      return null;
    }
  }

  async getMaterialById(id: number, parejaId?: string): Promise<Material | null> {
    return this.obtenerPorId(id, parejaId);
  }

  async refreshMaterial(id: number): Promise<Material | null> {
    return this.obtenerPorId(id);
  }

  async getMaterialesBajoStock(parejaId?: string): Promise<Material[]> {
    try {
      const mats = await this.listar({ incluir_inactivos: true, pareja_id: parejaId });
      return (mats ?? []).filter((m) => {
        if (!(m.activo ?? true)) return false;
        const stock = Number(m.stock_actual ?? 0);
        const minimo = Number(m.stock_minimo ?? 0);
        return Number.isFinite(stock) && Number.isFinite(minimo) && stock <= minimo;
      });
    } catch (e) {
      console.error('Error listando materiales bajo stock:', e);
      return [];
    }
  }

  async getMaterialesConEstadoStock(parejaId?: string): Promise<ResultadoStockMaterial[]> {
    try {
      const mats = await this.listar({ incluir_inactivos: true, pareja_id: parejaId });
      return (mats ?? []).map((m) => ({
        material_id: m.id!,
        nombre: m.nombre,
        stock_actual: Number(m.stock_actual ?? 0),
        stock_minimo: Number(m.stock_minimo ?? 0),
        unidad_base: m.unidad_base,
        estado_stock: getEstadoStock(m),
      }));
    } catch (e) {
      console.error('Error listando materiales con estado stock:', e);
      return [];
    }
  }

  async crear(
    payload: Omit<Material, 'id' | 'pareja_id' | 'costo_unitario' | 'unidad_base'>,
  ): Promise<Material | null> {
    try {
      const parejaId = await this.requireParejaId();

      const costo = this.costos.calcularCostoUnitarioMaterial({
        unidad_compra: payload.unidad_compra,
        cantidad_compra: payload.cantidad_compra,
        precio_compra: payload.precio_compra,
      });

      if (!costo) {
        throw new Error('No se pudo calcular el costo unitario. Revisa unidad, cantidad y precio.');
      }

      const record: Material = {
        ...payload,
        pareja_id: parejaId,
        costo_unitario: costo.costo_unitario,
        unidad_base: costo.unidad_base,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando material:', error);
        return null;
      }

      return (data as Material) ?? null;
    } catch (e) {
      console.error('Error creando material:', e);
      return null;
    }
  }

  async actualizar(id: number, cambios: Partial<Material>): Promise<Material | null> {
    try {
      const parejaId = await this.requireParejaId();

      const payload: any = { ...cambios };
      delete payload.stock_actual;
      if (
        payload.unidad_compra ||
        payload.cantidad_compra != null ||
        payload.precio_compra != null
      ) {
        const current = await this.obtenerPorId(id);
        if (!current) throw new Error('Material no encontrado');

        const unidad_compra = (payload.unidad_compra ?? current.unidad_compra) as any;
        const cantidad_compra = Number(payload.cantidad_compra ?? current.cantidad_compra);
        const precio_compra = Number(payload.precio_compra ?? current.precio_compra);

        const costo = this.costos.calcularCostoUnitarioMaterial({
          unidad_compra,
          cantidad_compra,
          precio_compra,
        });
        if (!costo) {
          throw new Error('No se pudo recalcular el costo unitario.');
        }

        payload.costo_unitario = costo.costo_unitario;
        payload.unidad_base = costo.unidad_base;
      }

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update(payload)
        .eq('id', id)
        .eq('pareja_id', parejaId)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando material:', error);
        return null;
      }

      return (data as Material) ?? null;
    } catch (e) {
      console.error('Error actualizando material:', e);
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
        console.error('Error actualizando activo de material:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error actualizando activo de material:', e);
      return false;
    }
  }
}
