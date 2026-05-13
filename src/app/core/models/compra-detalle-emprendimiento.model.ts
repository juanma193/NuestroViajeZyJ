import type { Material, UnidadCantidad } from './material.model';

export interface CompraDetalleEmprendimiento {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  compra_id: number;
  material_id: number;

  cantidad: number;
  unidad: UnidadCantidad;
  precio_total: number;
  costo_unitario: number;

  observaciones?: string | null;

  material?: Material | null;
}
