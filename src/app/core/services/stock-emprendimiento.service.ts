import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { Material, UnidadBaseUso } from '../models/material.model';
import type {
  MovimientoStock,
  TipoMovimientoStock,
} from '../models/movimiento-stock.model';
import { getEstadoStock } from './emprendimiento-stock.helpers';
import type { EstadoStock } from '../models/movimiento-stock.model';
import { MaterialesService } from './materiales.service';

export interface RegistrarMovimientoStockPayload {
  material_id: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  unidad: UnidadBaseUso;
  motivo: string;
  observaciones?: string | null;
  compra_id?: number | null;
  compra_detalle_id?: number | null;
  producto_id?: number | null;
  venta_id?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class StockEmprendimientoService {
  private readonly movimientosTable = 'movimientos_stock';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
    private materialesService: MaterialesService,
  ) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async getMovimientosStock(parejaId?: string): Promise<MovimientoStock[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.movimientosTable)
        .select('*, material:materiales(*)')
        .eq('pareja_id', pid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando movimientos:', error);
        return [];
      }

      return (data as MovimientoStock[]) ?? [];
    } catch (e) {
      console.error('Error listando movimientos:', e);
      return [];
    }
  }

  async getMovimientosByMaterial(materialId: number, parejaId?: string): Promise<MovimientoStock[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.movimientosTable)
        .select('*')
        .eq('pareja_id', pid)
        .eq('material_id', materialId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando movimientos por material:', error);
        return [];
      }

      return (data as MovimientoStock[]) ?? [];
    } catch (e) {
      console.error('Error listando movimientos por material:', e);
      return [];
    }
  }

  async getMovimientosByCompra(compraId: number, parejaId?: string): Promise<MovimientoStock[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.movimientosTable)
        .select('*, material:materiales(id,nombre,unidad_base)')
        .eq('pareja_id', pid)
        .eq('compra_id', compraId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando movimientos por compra:', error);
        return [];
      }

      return (data as MovimientoStock[]) ?? [];
    } catch (e) {
      console.error('Error listando movimientos por compra:', e);
      return [];
    }
  }

  async registrarMovimientoStockDetailed(
    payload: RegistrarMovimientoStockPayload,
    parejaId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const args = {
        p_pareja_id: pid,
        p_material_id: payload.material_id,
        p_tipo: payload.tipo,
        p_cantidad: payload.cantidad,
        p_unidad: payload.unidad,
        p_motivo: payload.motivo,
        p_observaciones: payload.observaciones ?? null,
        p_compra_id: payload.compra_id ?? null,
        p_compra_detalle_id: payload.compra_detalle_id ?? null,
        p_producto_id: payload.producto_id ?? null,
        p_venta_id: payload.venta_id ?? null,
      };

      const { error } = await this.supabase.supabase.rpc('registrar_movimiento_stock', args);
      if (error) {
        const message = String(error.message ?? 'Error registrando movimiento');
        console.error('Error registrando movimiento stock:', error);
        return { ok: false, error: message };
      }

      return { ok: true };
    } catch (e) {
      console.error('Error registrando movimiento stock:', e);
      return { ok: false, error: 'Error registrando movimiento' };
    }
  }

  async registrarMovimientoStock(payload: RegistrarMovimientoStockPayload, parejaId?: string): Promise<boolean> {
    const res = await this.registrarMovimientoStockDetailed(payload, parejaId);
    return res.ok;
  }

  async ajustarStockMaterial(
    material: Material,
    nuevoStockFinal: number,
    motivo: string,
    observaciones?: string | null,
  ): Promise<boolean> {
    const cantidad = Number(nuevoStockFinal);
    if (!Number.isFinite(cantidad) || cantidad < 0) return false;
    return this.registrarMovimientoStock({
      material_id: material.id!,
      tipo: 'ajuste',
      cantidad,
      unidad: material.unidad_base,
      motivo,
      observaciones: observaciones ?? null,
    });
  }

  async entradaManual(
    material: Material,
    cantidad: number,
    motivo: string,
    observaciones?: string | null,
  ): Promise<boolean> {
    const c = Number(cantidad);
    if (!Number.isFinite(c) || c <= 0) return false;
    return this.registrarMovimientoStock({
      material_id: material.id!,
      tipo: 'entrada',
      cantidad: c,
      unidad: material.unidad_base,
      motivo,
      observaciones: observaciones ?? null,
    });
  }

  async salidaManual(
    material: Material,
    cantidad: number,
    motivo: string,
    observaciones?: string | null,
  ): Promise<boolean> {
    const c = Number(cantidad);
    if (!Number.isFinite(c) || c <= 0) return false;
    return this.registrarMovimientoStock({
      material_id: material.id!,
      tipo: 'salida',
      cantidad: c,
      unidad: material.unidad_base,
      motivo,
      observaciones: observaciones ?? null,
    });
  }

  async registrarMerma(
    material: Material,
    cantidad: number,
    motivo: string,
    observaciones?: string | null,
  ): Promise<boolean> {
    const c = Number(cantidad);
    if (!Number.isFinite(c) || c <= 0) return false;
    return this.registrarMovimientoStock({
      material_id: material.id!,
      tipo: 'merma',
      cantidad: c,
      unidad: material.unidad_base,
      motivo,
      observaciones: observaciones ?? null,
    });
  }

  async devolucion(
    material: Material,
    cantidad: number,
    motivo: string,
    observaciones?: string | null,
  ): Promise<boolean> {
    const c = Number(cantidad);
    if (!Number.isFinite(c) || c <= 0) return false;
    return this.registrarMovimientoStock({
      material_id: material.id!,
      tipo: 'devolucion',
      cantidad: c,
      unidad: material.unidad_base,
      motivo,
      observaciones: observaciones ?? null,
    });
  }

  async getMaterialesBajoStock(parejaId?: string): Promise<Material[]> {
    try {
      // Filtramos en frontend porque la regla usa comparación de columnas.
      const mats = await this.materialesService.listar({
        incluir_inactivos: true,
        pareja_id: parejaId,
      });
      return (mats ?? []).filter((m) => {
        if (!(m.activo ?? true)) return false;
        const stock = Number(m.stock_actual ?? 0);
        const minimo = Number(m.stock_minimo ?? 0);
        return Number.isFinite(stock) && Number.isFinite(minimo) && stock <= minimo;
      });
    } catch (e) {
      console.error('Error listando bajo stock:', e);
      return [];
    }
  }

  getEstadoStock(material: Material): EstadoStock {
    return getEstadoStock(material);
  }

  prepararDescuentoPorProducto(productoId: number, cantidad: number) {
    // Etapa 3: descontar por receta usando producto_materiales.
    return { productoId, cantidad };
  }
}
