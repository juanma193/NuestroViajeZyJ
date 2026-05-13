import type { Producto } from '../models/producto.model';
import type { EstadoVenta } from '../models/venta-emprendimiento.model';

export const ESTADOS_VENTA: EstadoVenta[] = [
  'pendiente',
  'pagado',
  'en_produccion',
  'listo',
  'entregado',
  'cancelado',
];

export const CANALES_VENTA = ['Instagram', 'WhatsApp', 'Feria', 'Mercado Libre', 'Otro'] as const;

export const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Tarjeta', 'Otro'] as const;

export function getEstadoVentaLabel(estado: EstadoVenta | string | null | undefined): string {
  const map: Record<string, string> = {
    pendiente: 'Pendiente',
    pagado: 'Pagado',
    en_produccion: 'En producción',
    listo: 'Listo',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  return map[String(estado ?? '')] ?? 'Pendiente';
}

export function getEstadoVentaClass(estado: EstadoVenta | string | null | undefined): string {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-100 text-amber-800',
    pagado: 'bg-green-100 text-green-700',
    en_produccion: 'bg-blue-100 text-blue-700',
    listo: 'bg-purple-100 text-purple-700',
    entregado: 'bg-emerald-100 text-emerald-700',
    cancelado: 'bg-rose-100 text-rose-700',
  };
  return map[String(estado ?? '')] ?? map['pendiente'];
}

export function calcularLineaVenta(
  producto: Producto,
  cantidad: number,
  precioUnitario?: number | null,
): {
  precio_unitario: number;
  costo_unitario: number;
  precio_total: number;
  costo_total: number;
  ganancia: number;
} {
  const c = Math.max(0, Number(cantidad || 0));
  const precioBase =
    precioUnitario != null
      ? Number(precioUnitario)
      : Number(producto.precio_manual ?? producto.precio_sugerido ?? 0);
  const precio = Number.isFinite(precioBase) ? Math.max(0, precioBase) : 0;
  const costoBase = Number(producto.costo_calculado ?? 0);
  const costo = Number.isFinite(costoBase) ? Math.max(0, costoBase) : 0;
  const precio_total = precio * c;
  const costo_total = costo * c;

  return {
    precio_unitario: precio,
    costo_unitario: costo,
    precio_total,
    costo_total,
    ganancia: precio_total - costo_total,
  };
}

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}
