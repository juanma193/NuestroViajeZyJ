export interface ClienteEmprendimiento {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  nombre: string;
  telefono?: string | null;
  instagram?: string | null;
  direccion?: string | null;
  notas?: string | null;

  activo: boolean;
}
