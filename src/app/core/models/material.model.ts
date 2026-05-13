import type { CategoriaMaterial } from './categoria-material.model';
import type { ProveedorEmprendimiento } from './proveedor-emprendimiento.model';

export type UnidadCantidad = 'gr' | 'kg' | 'ml' | 'cc' | 'litro' | 'unidad' | 'metro' | 'cm';

export type UnidadBaseUso = 'gr' | 'kg' | 'ml' | 'cc' | 'litro' | 'unidad' | 'metro' | 'cm';

export interface Material {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  nombre: string;
  categoria_id?: number | null;
  categoria?: CategoriaMaterial | null;

  unidad_compra: UnidadCantidad;
  cantidad_compra: number;
  precio_compra: number;

  costo_unitario: number;
  unidad_base: UnidadBaseUso;

  stock_actual: number;
  stock_minimo: number;

  proveedor?: string | null;
  proveedor_id?: number | null;
  proveedor_rel?: ProveedorEmprendimiento | null;
  observaciones?: string | null;

  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
