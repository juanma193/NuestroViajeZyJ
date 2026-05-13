export interface CategoriaMaterial {
  id?: number;
  pareja_id?: string;
  nombre: string;
  descripcion?: string | null;
  orden?: number;
  activo?: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
