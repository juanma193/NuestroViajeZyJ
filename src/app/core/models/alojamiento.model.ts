export interface Alojamiento {
  id?: number;
  viaje_id: number;
  nombre: string;
  tipo?: string; // Hotel, Airbnb, Hostel, etc.
  direccion?: string;
  fecha_checkin: string; // date
  fecha_checkout: string; // date
  precio_noche?: number;
  notas?: string;
  created_at?: string;
}
