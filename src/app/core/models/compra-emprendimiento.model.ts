export interface CompraEmprendimiento {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  proveedor_id?: number | null;
  fecha: string;
  proveedor_nombre?: string | null;
  total: number;
  observaciones?: string | null;

  activo?: boolean;
}
