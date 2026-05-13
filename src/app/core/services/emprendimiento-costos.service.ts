import { Injectable } from '@angular/core';
import type { Material, UnidadBaseUso, UnidadCantidad } from '../models/material.model';
import type { Producto } from '../models/producto.model';
import type { ProductoMaterialConMaterial } from '../models/producto-con-materiales.model';
import type { ResultadoCalculoProducto } from '../models/resultado-calculo-producto.model';

export interface ResultadoCostoUnitarioMaterial {
  unidad_base: UnidadBaseUso;
  cantidad_base: number;
  costo_unitario: number;
}

@Injectable({
  providedIn: 'root',
})
export class EmprendimientoCostosService {
  calcularCostoUnitarioMaterial(params: {
    unidad_compra: UnidadCantidad;
    cantidad_compra: number;
    precio_compra: number;
  }): ResultadoCostoUnitarioMaterial | null {
    const { unidad_compra, cantidad_compra, precio_compra } = params;
    if (!unidad_compra) return null;
    if (!Number.isFinite(cantidad_compra) || cantidad_compra <= 0) return null;
    if (!Number.isFinite(precio_compra) || precio_compra < 0) return null;

    const normalized = this.normalizarCantidadCompra(unidad_compra, cantidad_compra);
    if (!normalized) return null;

    const costo_unitario = precio_compra / normalized.cantidad_base;
    if (!Number.isFinite(costo_unitario) || costo_unitario < 0) return null;

    return {
      unidad_base: normalized.unidad_base,
      cantidad_base: normalized.cantidad_base,
      costo_unitario,
    };
  }

  calcularProducto(params: {
    producto: Producto;
    items: ProductoMaterialConMaterial[];
    margen_porcentaje?: number;
  }): ResultadoCalculoProducto {
    const margen = Math.max(
      0,
      params.margen_porcentaje ?? params.producto.margen_porcentaje ?? 0,
    );

    const items = (params.items ?? []).map((item) => {
      const material = item.material as Material;
      const cantidadBase = this.convertirCantidadUsoAUnidadBase(
        item.receta.cantidad_usada,
        item.receta.unidad_uso,
        material.unidad_base,
      );

      const costo = cantidadBase == null ? 0 : cantidadBase * (material.costo_unitario ?? 0);
      return { item, costo };
    });

    const costo_total = items.reduce((acc, x) => acc + (Number.isFinite(x.costo) ? x.costo : 0), 0);
    const precio_sugerido = costo_total * (1 + margen / 100);

    return {
      costo_total,
      precio_sugerido,
      items,
    };
  }

  redondearPrecio(precio: number): number {
    if (!Number.isFinite(precio)) return 0;
    return Math.round(precio);
  }

  normalizarCantidadCompra(
    unidad_compra: UnidadCantidad,
    cantidad_compra: number,
  ): { unidad_base: UnidadBaseUso; cantidad_base: number } | null {
    if (!Number.isFinite(cantidad_compra) || cantidad_compra <= 0) return null;

    switch (unidad_compra) {
      case 'kg':
        return { unidad_base: 'gr', cantidad_base: cantidad_compra * 1000 };
      case 'gr':
        return { unidad_base: 'gr', cantidad_base: cantidad_compra };
      case 'litro':
        return { unidad_base: 'ml', cantidad_base: cantidad_compra * 1000 };
      case 'ml':
        return { unidad_base: 'ml', cantidad_base: cantidad_compra };
      case 'cc':
        return { unidad_base: 'cc', cantidad_base: cantidad_compra };
      case 'metro':
        return { unidad_base: 'metro', cantidad_base: cantidad_compra };
      case 'unidad':
        return { unidad_base: 'unidad', cantidad_base: cantidad_compra };
      default:
        return null;
    }
  }

  convertirCantidadUsoAUnidadBase(
    cantidad: number,
    unidad_uso: UnidadBaseUso,
    unidad_base: UnidadBaseUso,
  ): number | null {
    if (!Number.isFinite(cantidad) || cantidad < 0) return null;

    if (unidad_uso === unidad_base) return cantidad;

    // ml <-> cc (equivalentes)
    if (
      (unidad_uso === 'ml' && unidad_base === 'cc') ||
      (unidad_uso === 'cc' && unidad_base === 'ml')
    ) {
      return cantidad;
    }

    // sin conversión soportada
    return null;
  }
}
