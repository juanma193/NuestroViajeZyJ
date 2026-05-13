import type { Material } from './material.model';
import type { Producto } from './producto.model';
import type { ProductoMaterial } from './producto-material.model';

export interface ProductoMaterialConMaterial {
  receta: ProductoMaterial;
  material: Material;
}

export interface ProductoConMateriales {
  producto: Producto;
  materiales: ProductoMaterialConMaterial[];
}
