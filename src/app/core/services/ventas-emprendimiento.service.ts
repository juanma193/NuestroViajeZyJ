import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { Producto } from '../models/producto.model';
import type {
  EstadoVenta,
  VentaEmprendimiento,
} from '../models/venta-emprendimiento.model';
import type { VentaDetalleEmprendimiento } from '../models/venta-detalle-emprendimiento.model';
import { calcularLineaVenta } from './emprendimiento-ventas.helpers';
import { ProductosService } from './productos.service';

export interface VentasFiltros {
  estado?: EstadoVenta | 'todos' | null;
  canal_venta?: string | null;
  medio_pago?: string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  cliente?: string | null;
  incluir_inactivas?: boolean;
}

export interface AddProductoAVentaParams {
  venta: VentaEmprendimiento;
  producto_id: number;
  cantidad: number;
  precio_unitario?: number | null;
  observaciones?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class VentasEmprendimientoService {
  private readonly ventasTable = 'ventas_emprendimiento';
  private readonly detallesTable = 'venta_detalles_emprendimiento';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
    private productosService: ProductosService,
  ) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async getVentas(parejaId?: string, filtros: VentasFiltros = {}): Promise<VentaEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      let q = this.supabase.supabase
        .from(this.ventasTable)
        .select('*')
        .eq('pareja_id', pid)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (!filtros.incluir_inactivas) q = q.eq('activo', true);
      if (filtros.estado && filtros.estado !== 'todos') q = q.eq('estado', filtros.estado);
      if (filtros.canal_venta) q = q.eq('canal_venta', filtros.canal_venta);
      if (filtros.medio_pago) q = q.eq('medio_pago', filtros.medio_pago);
      if (filtros.fecha_desde) q = q.gte('fecha', filtros.fecha_desde);
      if (filtros.fecha_hasta) q = q.lte('fecha', filtros.fecha_hasta);

      const { data, error } = await q;
      if (error) {
        console.error('Error listando ventas:', error);
        return [];
      }

      const buscar = (filtros.cliente ?? '').trim().toLowerCase();
      const ventas = (data as VentaEmprendimiento[]) ?? [];
      if (!buscar) return ventas;

      return ventas.filter((v) => (v.cliente_nombre ?? '').toLowerCase().includes(buscar));
    } catch (e) {
      console.error('Error listando ventas:', e);
      return [];
    }
  }

  async getVentaById(id: number, parejaId?: string): Promise<VentaEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.ventasTable)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo venta:', error);
        return null;
      }

      return (data as VentaEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error obteniendo venta:', e);
      return null;
    }
  }

  async getVentaConDetalles(
    id: number,
    parejaId?: string,
  ): Promise<{ venta: VentaEmprendimiento | null; detalles: VentaDetalleEmprendimiento[] }> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const [venta, detalles] = await Promise.all([
        this.getVentaById(id, pid),
        this.getDetallesByVenta(id, pid),
      ]);
      return { venta, detalles };
    } catch (e) {
      console.error('Error obteniendo venta con detalles:', e);
      return { venta: null, detalles: [] };
    }
  }

  async createVenta(payload: Partial<VentaEmprendimiento>): Promise<VentaEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const record: VentaEmprendimiento = {
        fecha: payload.fecha ?? this.today(),
        estado: payload.estado ?? 'pendiente',
        cliente_id: payload.cliente_id ?? null,
        cliente_nombre: payload.cliente_nombre ?? null,
        canal_venta: payload.canal_venta ?? null,
        medio_pago: payload.medio_pago ?? null,
        subtotal: Number(payload.subtotal ?? 0),
        descuento: Number(payload.descuento ?? 0),
        recargo: Number(payload.recargo ?? 0),
        envio: Number(payload.envio ?? 0),
        total: Number(payload.total ?? 0),
        costo_total: Number(payload.costo_total ?? 0),
        ganancia_estimada: Number(payload.ganancia_estimada ?? 0),
        stock_descontado: payload.stock_descontado ?? false,
        observaciones: payload.observaciones ?? null,
        activo: payload.activo ?? true,
        pareja_id: pid,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.ventasTable)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando venta:', error);
        return null;
      }

      return (data as VentaEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error creando venta:', e);
      return null;
    }
  }

  async updateVenta(
    id: number,
    payload: Partial<VentaEmprendimiento>,
  ): Promise<VentaEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.ventasTable)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando venta:', error);
        return null;
      }

      return (data as VentaEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error actualizando venta:', e);
      return null;
    }
  }

  async deleteVenta(id: number): Promise<boolean> {
    const res = await this.updateVenta(id, { activo: false });
    return !!res;
  }

  async getDetallesByVenta(
    ventaId: number,
    parejaId?: string,
  ): Promise<VentaDetalleEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .select('*, producto:productos(*)')
        .eq('pareja_id', pid)
        .eq('venta_id', ventaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listando detalles de venta:', error);
        return [];
      }

      return (data as VentaDetalleEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error listando detalles de venta:', e);
      return [];
    }
  }

  async addProductoAVenta(params: AddProductoAVentaParams): Promise<VentaDetalleEmprendimiento | null> {
    if (!params.venta.id) return null;
    if (params.venta.stock_descontado || params.venta.estado === 'cancelado') {
      console.warn('No se puede agregar producto a una venta bloqueada.');
      return null;
    }

    try {
      const pid = await this.requireParejaId();
      const producto = await this.productosService.getProductoById(params.producto_id, pid);
      if (!producto?.id) return null;

      const cantidad = Number(params.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) return null;

      const linea = calcularLineaVenta(producto as Producto, cantidad, params.precio_unitario);
      const record: VentaDetalleEmprendimiento = {
        pareja_id: pid,
        venta_id: params.venta.id,
        producto_id: producto.id,
        cantidad,
        precio_unitario: linea.precio_unitario,
        precio_total: linea.precio_total,
        costo_unitario: linea.costo_unitario,
        costo_total: linea.costo_total,
        observaciones: params.observaciones ?? null,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error agregando producto a venta:', error);
        return null;
      }

      await this.recalcularVenta(params.venta.id);
      return (data as VentaDetalleEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error agregando producto a venta:', e);
      return null;
    }
  }

  async updateDetalleVenta(
    id: number,
    payload: Partial<VentaDetalleEmprendimiento>,
  ): Promise<VentaDetalleEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const { data: actual } = await this.supabase.supabase
        .from(this.detallesTable)
        .select('venta:ventas_emprendimiento(stock_descontado,estado)')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      const venta = (actual as any)?.venta;
      if (venta?.stock_descontado || venta?.estado === 'cancelado') return null;

      const { data, error } = await this.supabase.supabase
        .from(this.detallesTable)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando detalle de venta:', error);
        return null;
      }

      const detalle = data as VentaDetalleEmprendimiento;
      await this.recalcularVenta(detalle.venta_id);
      return detalle;
    } catch (e) {
      console.error('Error actualizando detalle de venta:', e);
      return null;
    }
  }

  async deleteDetalleVenta(id: number): Promise<boolean> {
    try {
      const pid = await this.requireParejaId();
      const { data: actual, error: actualError } = await this.supabase.supabase
        .from(this.detallesTable)
        .select('venta_id, venta:ventas_emprendimiento(stock_descontado,estado)')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (actualError || !actual) {
        console.error('Error leyendo detalle de venta:', actualError);
        return false;
      }

      const venta = (actual as any)?.venta;
      if (venta?.stock_descontado || venta?.estado === 'cancelado') return false;

      const { error } = await this.supabase.supabase
        .from(this.detallesTable)
        .delete()
        .eq('id', id)
        .eq('pareja_id', pid);

      if (error) {
        console.error('Error eliminando detalle de venta:', error);
        return false;
      }

      await this.recalcularVenta(Number((actual as any).venta_id));
      return true;
    } catch (e) {
      console.error('Error eliminando detalle de venta:', e);
      return false;
    }
  }

  async recalcularVenta(ventaId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase.supabase.rpc(
        'recalcular_total_venta_emprendimiento',
        { p_venta_id: ventaId },
      );
      if (error) {
        console.error('Error recalculando venta:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error recalculando venta:', e);
      return false;
    }
  }

  async confirmarVentaYDescontarStock(
    ventaId: number,
    motivo = 'Venta confirmada',
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.supabase.rpc('confirmar_venta_y_descontar_stock', {
        p_venta_id: ventaId,
        p_motivo: motivo,
      });

      if (error) {
        console.error('Error confirmando venta:', error);
        return { ok: false, error: String(error.message ?? 'Error confirmando venta') };
      }

      return { ok: true };
    } catch (e) {
      console.error('Error confirmando venta:', e);
      return { ok: false, error: 'Error confirmando venta' };
    }
  }

  async cancelarVentaYReponerStock(
    ventaId: number,
    motivo = 'Venta cancelada',
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.supabase.rpc('cancelar_venta_y_reponer_stock', {
        p_venta_id: ventaId,
        p_motivo: motivo,
      });

      if (error) {
        console.error('Error cancelando venta:', error);
        return { ok: false, error: String(error.message ?? 'Error cancelando venta') };
      }

      return { ok: true };
    } catch (e) {
      console.error('Error cancelando venta:', e);
      return { ok: false, error: 'Error cancelando venta' };
    }
  }

  async cambiarEstadoVenta(ventaId: number, estado: EstadoVenta): Promise<VentaEmprendimiento | null> {
    if (estado === 'cancelado') return null;
    return this.updateVenta(ventaId, { estado });
  }

  private today(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
