export type EstadoVenta =
  | 'pendiente'
  | 'pagado'
  | 'en_produccion'
  | 'listo'
  | 'entregado'
  | 'cancelado';

export interface VentaEmprendimiento {
  id?: number;
  created_at?: string;
  updated_at?: string;
  pareja_id?: string;

  cliente_id?: number | null;
  cliente_nombre?: string | null;
  fecha: string;
  estado: EstadoVenta;
  canal_venta?: string | null;
  medio_pago?: string | null;

  subtotal: number;
  descuento: number;
  recargo: number;
  envio: number;
  total: number;
  costo_total: number;
  ganancia_estimada: number;
  stock_descontado: boolean;

  observaciones?: string | null;
  activo: boolean;
}

export interface ResumenVenta {
  subtotal: number;
  descuento: number;
  recargo: number;
  envio: number;
  total: number;
  costo_total: number;
  ganancia_estimada: number;
}
