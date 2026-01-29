export interface Tarea {
  id?: number;
  pareja_id?: string;
  titulo: string;
  descripcion?: string;
  categoria_id?: number;
  prioridad?: 'baja' | 'media' | 'alta' | string;
  completada?: boolean;
  fecha_vencimiento?: string;
  fecha_completada?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}
