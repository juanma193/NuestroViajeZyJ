export type UnidadCantidad =
  | 'gr'
  | 'kg'
  | 'ml'
  | 'cc'
  | 'litro'
  | 'unidad'
  | 'metro';

export type UnidadBaseUso = 'gr' | 'ml' | 'cc' | 'unidad' | 'metro';

export interface Material {
  id?: number;
  pareja_id?: string;

  nombre: string;
  categoria_id?: number | null;

  unidad_compra: UnidadCantidad;
  cantidad_compra: number;
  precio_compra: number;

  costo_unitario: number;
  unidad_base: UnidadBaseUso;

  stock_actual: number;
  stock_minimo: number;

  proveedor?: string | null;
  observaciones?: string | null;

  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
