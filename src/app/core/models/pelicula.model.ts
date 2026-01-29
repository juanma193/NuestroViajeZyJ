export interface Pelicula {
  id?: number;
  created_at?: string;
  pareja_id?: string;
  nombre: string;
  fecha_estreno: string;
  puntuacion: number;
  comentario: string;
  visto: boolean;
}
