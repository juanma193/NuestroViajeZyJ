import type { Producto } from './producto.model';
import type { VentaEmprendimiento } from './venta-emprendimiento.model';

export interface VentaDetalleEmprendimiento {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  costo_unitario: number;
  costo_total: number;
  observaciones?: string | null;

  producto?: Producto | null;
}

export interface VentaConDetalles {
  venta: VentaEmprendimiento;
  detalles: VentaDetalleEmprendimiento[];
}
