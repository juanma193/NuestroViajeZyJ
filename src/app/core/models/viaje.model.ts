export interface Viaje {
  id?: number;
  created_at?: string;
  pareja_id?: string;
  nombre: string;
  descripcion: string;
  fecha_desde?: string; // ISO date
  fecha_hasta?: string; // ISO date
  estado?: boolean;
}
