import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/toast/services/toast.service';
import type { Material, UnidadBaseUso } from '../../../core/models/material.model';
import type { Producto } from '../../../core/models/producto.model';
import type { ProductoMaterial } from '../../../core/models/producto-material.model';
import type { ProductoMaterialConMaterial } from '../../../core/models/producto-con-materiales.model';
import { EmprendimientoCostosService } from '../../../core/services/emprendimiento-costos.service';
import { MaterialesService } from '../../../core/services/materiales.service';
import { ProductoMaterialesService } from '../../../core/services/producto-materiales.service';
import { ProductosService } from '../../../core/services/productos.service';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';

@Component({
  selector: 'app-emprendimiento-calculadora',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NonNegativeNumberDirective],
  templateUrl: './emprendimiento-calculadora.component.html',
})
export class EmprendimientoCalculadoraComponent implements OnInit {
  cargando = false;

  productos: Producto[] = [];
  materiales: Material[] = [];

  productoIdSeleccionado: number | null = null;
  producto: Producto | null = null;

  items: ProductoMaterialConMaterial[] = [];

  margenSimulado: number | null = null;
  redondear = false;

  constructor(
    private productosService: ProductosService,
    private recetaService: ProductoMaterialesService,
    private materialesService: MaterialesService,
    public costos: EmprendimientoCostosService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarInicial();
  }

  async cargarInicial() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [productos, materiales] = await Promise.all([
        this.productosService.listar({ incluir_inactivos: true }),
        this.materialesService.listar({ incluir_inactivos: true }),
      ]);
      this.productos = productos;
      this.materiales = materiales;
    } catch (e) {
      console.error('Error cargando calculadora:', e);
      this.toast.showError('Error', 'No se pudo cargar la calculadora');
      this.productos = [];
      this.materiales = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  get resultado() {
    if (!this.producto) return null;
    const margen = this.margenSimulado ?? this.producto.margen_porcentaje;
    const res = this.costos.calcularProducto({
      producto: this.producto,
      items: this.items,
      margen_porcentaje: margen,
    });
    const precio = this.redondear
      ? this.costos.redondearPrecio(res.precio_sugerido)
      : res.precio_sugerido;
    return { ...res, precio_sugerido: precio };
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

  async seleccionarProducto() {
    if (!this.productoIdSeleccionado) {
      this.producto = null;
      this.items = [];
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const producto = await this.productosService.obtenerPorId(this.productoIdSeleccionado);
      if (!producto) {
        this.toast.showError('Error', 'No se encontró el producto');
        this.producto = null;
        this.items = [];
        return;
      }

      const receta = await this.recetaService.listarPorProducto(this.productoIdSeleccionado);
      this.producto = producto;
      this.margenSimulado = producto.margen_porcentaje;

      const map = new Map<number, Material>();
      for (const m of this.materiales ?? []) {
        if (m.id) map.set(m.id, m);
      }

      this.items = (receta ?? [])
        .map((r: ProductoMaterial) => {
          const material = map.get(r.material_id);
          if (!material) return null;
          return {
            receta: { ...r },
            material,
          };
        })
        .filter(Boolean) as ProductoMaterialConMaterial[];
    } catch (e) {
      console.error('Error seleccionando producto:', e);
      this.toast.showError('Error', 'No se pudo cargar el producto');
      this.producto = null;
      this.items = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}
