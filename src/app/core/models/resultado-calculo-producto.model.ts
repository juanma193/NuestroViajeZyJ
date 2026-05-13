import type { ProductoMaterialConMaterial } from './producto-con-materiales.model';

export interface ResultadoItemMaterial {
  item: ProductoMaterialConMaterial;
  costo: number;
}

export interface ResultadoCalculoProducto {
  costo_total: number;
  precio_sugerido: number;
  items: ResultadoItemMaterial[];
}
