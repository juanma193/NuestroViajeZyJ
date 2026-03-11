export interface LugarPorVisitar {
  id?: number;
  pareja_id?: string;
  nombre: string;
  ubicacion: string;
  descripcion?: string;
  categoria: string;
  visitado?: boolean;
  fecha_visitado?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
