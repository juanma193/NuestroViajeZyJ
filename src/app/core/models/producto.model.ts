export interface Producto {
  id?: number;
  pareja_id?: string;

  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;

  tiempo_produccion_min?: number | null;
  margen_ganancia_pct: number;

  costo_calculado?: number | null;
  precio_sugerido?: number | null;
  precio_manual?: number | null;

  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
