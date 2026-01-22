export interface ActividadViaje {
  id?: number;
  viaje_id: number;
  nombre: string;
  descripcion?: string;
  fecha?: string; // date
  hora?: string; // time
  ubicacion?: string;
  precio?: number;
  completada?: boolean;
  prioridad?: string; // Alta, Media, Baja
  created_at?: string;
}
