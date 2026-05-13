import type { Material, UnidadCantidad, UnidadBaseUso } from './material.model';

export type TipoMovimientoStock =
  | 'entrada'
  | 'salida'
  | 'ajuste'
  | 'merma'
  | 'devolucion'
  | 'compra'
  | 'produccion'
  | 'venta';

export type EstadoStock = 'disponible' | 'bajo' | 'sin_stock' | 'inactivo';

export interface MovimientoStock {
  id?: number;
  created_at?: string;
  pareja_id?: string;

  material_id: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  unidad: UnidadCantidad | UnidadBaseUso;

  stock_anterior?: number | null;
  stock_nuevo?: number | null;

  motivo: string;
  observaciones?: string | null;

  compra_id?: number | null;
  compra_detalle_id?: number | null;
  producto_id?: number | null;
  venta_id?: number | null;

  material?: Material | null;
}

export interface ResultadoStockMaterial {
  material_id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_base: UnidadBaseUso;
  estado_stock: EstadoStock;
}
