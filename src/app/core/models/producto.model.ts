export interface Producto {
  id?: number;
  pareja_id?: string;

  created_at?: string;
  updated_at?: string;

  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;

  tiempo_produccion_minutos?: number | null;
  margen_porcentaje: number;

  costo_calculado?: number | null;
  precio_sugerido?: number | null;
  precio_manual?: number | null;

  observaciones?: string | null;
  foto_path?: string | null;
  foto_url?: string | null;

  activo?: boolean;
}
