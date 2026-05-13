import type { UnidadBaseUso } from './material.model';

export interface ProductoMaterial {
  id?: number;
  pareja_id?: string;

  producto_id: number;
  material_id: number;

  cantidad_usada: number;
  unidad_uso: UnidadBaseUso;

  costo_calculado: number;

  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
