export interface Vuelo {
  id?: number;
  viaje_id: number;
  aerolinea?: string;
  numero_vuelo?: string;
  origen: string;
  destino: string;
  fecha_salida?: string; // date
  hora_salida?: string; // time
  fecha_llegada?: string; // date
  hora_llegada?: string; // time
  precio?: number;
  notas?: string;
  created_at?: string;
}
