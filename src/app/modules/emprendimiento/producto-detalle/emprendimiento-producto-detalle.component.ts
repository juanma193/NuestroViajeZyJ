import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastService } from '../../../core/toast/services/toast.service';
import type { Material, UnidadBaseUso } from '../../../core/models/material.model';
import type { Producto } from '../../../core/models/producto.model';
import type { ProductoMaterial } from '../../../core/models/producto-material.model';
import type { ProductoMaterialConMaterial } from '../../../core/models/producto-con-materiales.model';
import { MaterialesService } from '../../../core/services/materiales.service';
import { ProductoMaterialesService } from '../../../core/services/producto-materiales.service';
import { ProductosService } from '../../../core/services/productos.service';
import { EmprendimientoCostosService } from '../../../core/services/emprendimiento-costos.service';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';

@Component({
  selector: 'app-emprendimiento-producto-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NonNegativeNumberDirective],
  templateUrl: './emprendimiento-producto-detalle.component.html',
})
export class EmprendimientoProductoDetalleComponent implements OnInit {
  cargando = false;

  productoId?: number;
  producto: Producto | null = null;

  materiales: Material[] = [];
  receta: ProductoMaterial[] = [];
  items: ProductoMaterialConMaterial[] = [];

  margenEdicion: number | null = null;

  nuevo: {
    material_id: number | null;
    cantidad_usada: number | null;
    unidad_uso: UnidadBaseUso | null;
  } = { material_id: null, cantidad_usada: null, unidad_uso: null };

  constructor(
    private route: ActivatedRoute,
    private productosService: ProductosService,
    private recetaService: ProductoMaterialesService,
    private materialesService: MaterialesService,
    private costos: EmprendimientoCostosService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) {
      this.toast.showError('Error', 'Producto inválido');
      return;
    }
    this.productoId = id;
    await this.cargar();
  }

  get resultado() {
    if (!this.producto) return null;
    return this.costos.calcularProducto({
      producto: this.producto,
      items: this.items,
      margen_porcentaje: this.margenEdicion ?? this.producto.margen_porcentaje,
    });
  }

  get materialesDisponiblesParaAgregar(): Material[] {
    const usados = new Set(this.receta.map((r) => r.material_id));
    return (this.materiales ?? [])
      .filter((m) => (m.activo ?? true) && !!m.id && !usados.has(m.id))
      .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
  }

  unidadOpcionesPara(material: Material | null): UnidadBaseUso[] {
    if (!material) return ['unidad', 'gr', 'ml', 'cc', 'metro'];
    const base = material.unidad_base;
    if (base === 'gr') return ['gr'];
    if (base === 'ml') return ['ml', 'cc'];
    if (base === 'cc') return ['cc', 'ml'];
    if (base === 'unidad') return ['unidad'];
    if (base === 'metro') return ['metro'];
    return ['unidad'];
  }

  materialSeleccionadoNuevo(): Material | null {
    const id = this.nuevo.material_id;
    if (!id) return null;
    return this.materiales.find((m) => m.id === id) ?? null;
  }

  async cargar() {
    if (!this.productoId) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const [producto, receta, materiales] = await Promise.all([
        this.productosService.obtenerPorId(this.productoId),
        this.recetaService.listarPorProducto(this.productoId),
        this.materialesService.listar({ incluir_inactivos: true }),
      ]);

      this.producto = producto;
      this.margenEdicion = producto?.margen_porcentaje ?? null;
      this.receta = receta;
      this.materiales = materiales;

      this.rebuildItems();
    } catch (e) {
      console.error('Error cargando detalle de producto:', e);
      this.toast.showError('Error', 'No se pudo cargar el producto');
      this.producto = null;
      this.receta = [];
      this.items = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  rebuildItems() {
    const map = new Map<number, Material>();
    for (const m of this.materiales ?? []) {
      if (m.id) map.set(m.id, m);
    }

    this.items = (this.receta ?? [])
      .map((r) => {
        const material = map.get(r.material_id);
        if (!material) return null;
        return {
          receta: r,
          material,
        };
      })
      .filter(Boolean) as ProductoMaterialConMaterial[];
  }

  costoItem(item: ProductoMaterialConMaterial): number {
    const res = this.costos.calcularProducto({
      producto: this.producto!,
      items: [item],
      margen_porcentaje: 0,
    });
    return res.items[0]?.costo ?? 0;
  }

  async agregarMaterial() {
    if (!this.productoId || !this.producto) return;
    const material = this.materialSeleccionadoNuevo();
    if (!material || !material.id) {
      this.toast.showWarning('Falta información', 'Selecciona un material');
      return;
    }

    const cantidad = Number(this.nuevo.cantidad_usada);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.toast.showWarning('Revisar datos', 'La cantidad usada debe ser > 0');
      return;
    }

    const unidad = this.nuevo.unidad_uso ?? material.unidad_base;
    // Verificar conversión (ml <-> cc permitido)
    const cantidadBase = this.costos.convertirCantidadUsoAUnidadBase(
      cantidad,
      unidad,
      material.unidad_base,
    );
    if (cantidadBase == null) {
      this.toast.showWarning('Revisar datos', 'La unidad de uso no es compatible con el material');
      return;
    }

    const costo = cantidadBase * (material.costo_unitario ?? 0);

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const creado = await this.recetaService.agregar({
        producto_id: this.productoId,
        material_id: material.id,
        cantidad_usada: cantidad,
        unidad_uso: unidad,
        costo_calculado: costo,
      });

      if (!creado) {
        this.toast.showError('Error', 'No se pudo agregar el material');
        return;
      }

      this.nuevo = { material_id: null, cantidad_usada: null, unidad_uso: null };
      await this.cargar();
      this.toast.showSuccess('Éxito', 'Material agregado');
    } catch (e) {
      console.error('Error agregando material:', e);
      this.toast.showError('Error', 'Error al agregar el material');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarItem(item: ProductoMaterialConMaterial) {
    if (!item.receta.id) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const ok = await this.recetaService.eliminar(item.receta.id);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo eliminar el material');
        return;
      }

      await this.cargar();
      this.toast.showSuccess('Éxito', 'Material eliminado');
    } catch (e) {
      console.error('Error eliminando item:', e);
      this.toast.showError('Error', 'Error al eliminar el material');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  recalcularEnMemoria() {
    // los cálculos se basan en this.items y this.margenEdicion
    // no hace falta nada acá, pero se deja por botón explícito
    this.cdr.detectChanges();
  }

  async guardarTodo() {
    if (!this.productoId || !this.producto) return;

    const margen = Number(this.margenEdicion);
    if (!Number.isFinite(margen) || margen < 0) {
      this.toast.showWarning('Revisar datos', 'El margen debe ser ≥ 0');
      return;
    }

    const result = this.resultado;
    if (!result) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      // Actualizar receta (cantidades + costo_calculado)
      await Promise.all(
        this.items.map(async (it) => {
          if (!it.receta.id) return;
          const material = it.material;
          const cantidadBase = this.costos.convertirCantidadUsoAUnidadBase(
            it.receta.cantidad_usada,
            it.receta.unidad_uso,
            material.unidad_base,
          );
          const costo = cantidadBase == null ? 0 : cantidadBase * (material.costo_unitario ?? 0);
          await this.recetaService.actualizar(it.receta.id, {
            cantidad_usada: it.receta.cantidad_usada,
            unidad_uso: it.receta.unidad_uso,
            costo_calculado: costo,
          });
        }),
      );

      // Guardar margen + costos en producto
      await this.productosService.actualizar(this.productoId, { margen_porcentaje: margen });
      const ok = await this.productosService.actualizarCostos(this.productoId, {
        costo_calculado: result.costo_total,
        precio_sugerido: result.precio_sugerido,
      });

      if (!ok) {
        this.toast.showError('Error', 'No se pudieron guardar los costos');
        return;
      }

      this.toast.showSuccess('Éxito', 'Receta y costos guardados');
      await this.cargar();
    } catch (e) {
      console.error('Error guardando receta/costos:', e);
      this.toast.showError('Error', 'Error al guardar');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}
