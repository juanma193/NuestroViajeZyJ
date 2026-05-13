import type { Material, UnidadCantidad, UnidadBaseUso } from '../models/material.model';
import type { EstadoStock } from '../models/movimiento-stock.model';

export function getEstadoStock(material: Material): EstadoStock {
  if (!(material.activo ?? true)) return 'inactivo';
  const stock = Number(material.stock_actual ?? 0);
  const minimo = Number(material.stock_minimo ?? 0);
  if (!Number.isFinite(stock) || stock <= 0) return 'sin_stock';
  if (Number.isFinite(minimo) && stock <= minimo) return 'bajo';
  return 'disponible';
}

export function getCantidadFaltante(material: Material): number {
  const stock = Number(material.stock_actual ?? 0);
  const minimo = Number(material.stock_minimo ?? 0);
  if (!Number.isFinite(stock) || !Number.isFinite(minimo)) return 0;
  return Math.max(minimo - stock, 0);
}

export function convertirAUnidadBase(
  cantidad: number,
  unidadOrigen: UnidadCantidad,
  unidadBase: UnidadBaseUso,
): number {
  const value = Number(cantidad ?? 0);
  if (!Number.isFinite(value)) return 0;

  if (unidadOrigen === unidadBase) return value;

  if (unidadOrigen === 'kg' && unidadBase === 'gr') return value * 1000;
  if (unidadOrigen === 'gr' && unidadBase === 'kg') return value / 1000;

  if (unidadOrigen === 'litro' && (unidadBase === 'ml' || unidadBase === 'cc')) return value * 1000;
  if ((unidadOrigen === 'ml' || unidadOrigen === 'cc') && unidadBase === 'litro') return value / 1000;

  if (unidadOrigen === 'ml' && unidadBase === 'cc') return value;
  if (unidadOrigen === 'cc' && unidadBase === 'ml') return value;

  if (unidadOrigen === 'cm' && unidadBase === 'metro') return value / 100;
  if (unidadOrigen === 'metro' && unidadBase === 'cm') return value * 100;

  return value;
}

export function formatCantidadUnidad(cantidad: number | null | undefined, unidad: string | null | undefined): string {
  const c = Number(cantidad ?? 0);
  const u = (unidad ?? '').trim();
  if (!u) return `${Number.isFinite(c) ? c : 0}`;
  return `${Number.isFinite(c) ? c : 0} ${u}`;
}
