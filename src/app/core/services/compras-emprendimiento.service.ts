import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { CompraEmprendimiento } from '../models/compra-emprendimiento.model';
import type { CompraDetalleEmprendimiento } from '../models/compra-detalle-emprendimiento.model';
import type { Material } from '../models/material.model';
import { convertirAUnidadBase } from './emprendimiento-stock.helpers';
import { StockEmprendimientoService } from './stock-emprendimiento.service';

@Injectable({
  providedIn: 'root',
})
export class ComprasEmprendimientoService {
  private readonly comprasTable = 'compras_emprendimiento';
  private readonly detallesTable = 'compra_detalles_emprendimiento';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
    private stock: StockEmprendimientoService,
  ) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async getCompras(parejaId?: string): Promise<CompraEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.comprasTable)
        .select('*')
        .eq('pareja_id', pid)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando compras:', error);
        return [];
      }
      return (data as CompraEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error listando compras:', e);
      return [];
    }
  }

  async getCompraById(id: number, parejaId?: string): Promise<CompraEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.comprasTable)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo compra:', error);
        return null;
      }
      return (data as CompraEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error obteniendo compra:', e);
      return null;
    }
  }

  async getCompraConDetalles(
    id: number,
    parejaId?: string,
  ): Promise<{ compra: CompraEmprendimiento | null; detalles: CompraDetalleEmprendimiento[] }> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const [compra, detalles] = await Promise.all([
        this.getCompraById(id, pid),
        this.getDetallesByCompra(id, pid),
      ]);
      return { compra, detalles };
    } catch (e) {
      console.error('Error obteniendo compra con detalles:', e);
      return { compra: null, detalles: [] };
    }
  }

  async createCompra(
    payload: Omit<CompraEmprendimiento, 'id' | 'created_at' | 'updated_at' | 'pareja_id' | 'total'> & {
      total?: number | null;
    },
  ): Promise<CompraEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const record: CompraEmprendimiento = {
        ...payload,
        pareja_id: pid,
        total: Number(payload.total ?? 0),
        activo: payload.activo ?? true,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.comprasTable)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando compra:', error);
        return null;
      }
      return (data as CompraEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error creando compra:', e);
      return null;
    }
  }

  async updateCompra(id: number, payload: Partial<CompraEmprendimiento>): Promise<CompraEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.comprasTable)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando compra:', error);
        return null;
      }
      return (data as CompraEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error actualizando compra:', e);
      return null;
    }
  }

  async deleteCompra(id: number): Promise<boolean> {
    // MVP: desactivar.
    const res = await this.updateCompra(id, { activo: false });
    return !!res;
  }

  async getDetallesByCompra(compraId: number, parejaId?: string): Promise<CompraDetalleEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .select('*, material:materiales(*)')
        .eq('pareja_id', pid)
        .eq('compra_id', compraId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando detalles compra:', error);
        return [];
      }
      return (data as CompraDetalleEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error listando detalles compra:', e);
      return [];
    }
  }

  async createDetalleCompra(params: {
    compra_id: number;
    material: Material;
    cantidad: number;
    unidad: any;
    precio_total: number;
    observaciones?: string | null;
  }): Promise<CompraDetalleEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();

      const cantidadBase = convertirAUnidadBase(params.cantidad, params.unidad, params.material.unidad_base);
      if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
        throw new Error('Cantidad inválida para calcular costo unitario');
      }
      const precioTotal = Number(params.precio_total ?? 0);
      const costoUnitario = precioTotal / cantidadBase;

      const detailRecord: CompraDetalleEmprendimiento = {
        compra_id: params.compra_id,
        material_id: params.material.id!,
        cantidad: Number(params.cantidad),
        unidad: params.unidad,
        precio_total: precioTotal,
        costo_unitario: Number.isFinite(costoUnitario) ? costoUnitario : 0,
        observaciones: params.observaciones ?? null,
        pareja_id: pid,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .insert([detailRecord])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando detalle compra:', error);
        return null;
      }

      const detalleCreado = (data as CompraDetalleEmprendimiento) ?? null;
      if (!detalleCreado?.id) return null;

      // Registrar movimiento stock tipo compra en unidad_base.
      const okStock = await this.stock.registrarMovimientoStock({
        material_id: params.material.id!,
        tipo: 'compra',
        cantidad: cantidadBase,
        unidad: params.material.unidad_base,
        motivo: 'Compra',
        observaciones: params.observaciones ?? null,
        compra_id: params.compra_id,
        compra_detalle_id: detalleCreado.id,
        producto_id: null,
        venta_id: null,
      });

      if (!okStock) {
        // Intentar rollback del detalle para evitar inconsistencia.
        await this.supabase.supabase.from(this.detallesTable).delete().eq('id', detalleCreado.id).eq('pareja_id', pid);
        return null;
      }

      await this.recalcularTotalCompra(params.compra_id);

      return detalleCreado;
    } catch (e) {
      console.error('Error creando detalle compra:', e);
      return null;
    }
  }

  async updateDetalleCompra(id: number, payload: Partial<CompraDetalleEmprendimiento>): Promise<CompraDetalleEmprendimiento | null> {
    // MVP: para evitar duplicar movimientos, no permitimos editar cantidad/unidad/precio_total una vez confirmado.
    if (payload.cantidad != null || payload.unidad != null || payload.precio_total != null) {
      console.warn('MVP: no se permite editar cantidad/unidad/precio_total de un detalle confirmado.');
      return null;
    }

    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando detalle compra:', error);
        return null;
      }
      return (data as CompraDetalleEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error actualizando detalle compra:', e);
      return null;
    }
  }

  async deleteDetalleCompra(id: number): Promise<boolean> {
    // MVP: no eliminamos detalles confirmados porque implicaría revertir stock.
    console.warn('MVP: no se permite eliminar detalles de compra desde la UI.');
    return false;
  }

  async recalcularTotalCompra(compraId: number): Promise<number> {
    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .select('precio_total')
        .eq('pareja_id', pid)
        .eq('compra_id', compraId);

      if (error) {
        console.error('Error leyendo detalles para total:', error);
        return 0;
      }

      const total = (data ?? []).reduce((acc: number, row: any) => acc + Number(row?.precio_total ?? 0), 0);
      await this.updateCompra(compraId, { total });
      return total;
    } catch (e) {
      console.error('Error recalculando total compra:', e);
      return 0;
    }
  }
}
