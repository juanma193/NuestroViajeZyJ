import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/toast/services/toast.service';
import type { Producto } from '../../../core/models/producto.model';
import { ProductosService } from '../../../core/services/productos.service';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';

@Component({
  selector: 'app-emprendimiento-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NonNegativeNumberDirective],
  templateUrl: './emprendimiento-productos.component.html',
})
export class EmprendimientoProductosComponent implements OnInit {
  productos: Producto[] = [];
  cargando = false;

  buscar = '';
  mostrarInactivos = true;

  mostrandoFormulario = false;
  editandoId?: number;

  form: {
    nombre: string;
    descripcion: string;
    categoria: string;
    tiempo_produccion_min: number | null;
    margen_ganancia_pct: number | null;
    precio_manual: number | null;
    activo: boolean;
  } = this.getFormInicial();

  constructor(
    private productosService: ProductosService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get productosFiltrados(): Producto[] {
    const buscar = this.buscar.trim().toLowerCase();
    return (this.productos ?? []).filter((p) => {
      if (!this.mostrarInactivos && !(p.activo ?? true)) return false;
      if (buscar && !(p.nombre ?? '').toLowerCase().includes(buscar)) return false;
      return true;
    });
  }

  getFormInicial() {
    return {
      nombre: '',
      descripcion: '',
      categoria: '',
      tiempo_produccion_min: null,
      margen_ganancia_pct: 60,
      precio_manual: null,
      activo: true,
    };
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.productos = await this.productosService.listar({ incluir_inactivos: true });
    } catch (e) {
      console.error('Error cargando productos:', e);
      this.toast.showError('Error', 'No se pudieron cargar los productos');
      this.productos = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirNuevo() {
    this.editandoId = undefined;
    this.form = this.getFormInicial();
    this.mostrandoFormulario = true;
  }

  abrirEditar(producto: Producto) {
    this.editandoId = producto.id;
    this.form = {
      nombre: producto.nombre ?? '',
      descripcion: producto.descripcion ?? '',
      categoria: producto.categoria ?? '',
      tiempo_produccion_min: producto.tiempo_produccion_min ?? null,
      margen_ganancia_pct: producto.margen_ganancia_pct ?? 0,
      precio_manual: producto.precio_manual ?? null,
      activo: producto.activo ?? true,
    };
    this.mostrandoFormulario = true;
  }

  cerrarFormulario() {
    this.mostrandoFormulario = false;
    this.editandoId = undefined;
    this.form = this.getFormInicial();
  }

  async guardar() {
    const nombre = (this.form.nombre ?? '').trim();
    if (!nombre) {
      this.toast.showWarning('Falta información', 'El nombre es obligatorio');
      return;
    }

    const margen = Number(this.form.margen_ganancia_pct);
    if (!Number.isFinite(margen) || margen < 0) {
      this.toast.showWarning('Revisar datos', 'El margen debe ser ≥ 0');
      return;
    }

    const tiempo = this.form.tiempo_produccion_min == null ? null : Number(this.form.tiempo_produccion_min);
    if (tiempo != null && (!Number.isFinite(tiempo) || tiempo < 0)) {
      this.toast.showWarning('Revisar datos', 'El tiempo de producción debe ser ≥ 0');
      return;
    }

    const precioManual = this.form.precio_manual == null ? null : Number(this.form.precio_manual);
    if (precioManual != null && (!Number.isFinite(precioManual) || precioManual < 0)) {
      this.toast.showWarning('Revisar datos', 'El precio manual debe ser ≥ 0');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const payload: Omit<Producto, 'id' | 'pareja_id'> = {
        nombre,
        descripcion: this.form.descripcion.trim() ? this.form.descripcion.trim() : null,
        categoria: this.form.categoria.trim() ? this.form.categoria.trim() : null,
        tiempo_produccion_min: tiempo,
        margen_ganancia_pct: margen,
        costo_calculado: null,
        precio_sugerido: null,
        precio_manual: precioManual,
        activo: this.form.activo,
      };

      let res: Producto | null = null;
      if (this.editandoId) {
        res = await this.productosService.actualizar(this.editandoId, payload as any);
      } else {
        res = await this.productosService.crear(payload);
      }

      if (!res) {
        this.toast.showError('Error', 'No se pudo guardar el producto');
        return;
      }

      this.toast.showSuccess('Éxito', 'Producto guardado');
      this.cerrarFormulario();
      await this.cargar();
    } catch (e) {
      console.error('Error guardando producto:', e);
      this.toast.showError('Error', 'Error al guardar el producto');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleActivo(producto: Producto) {
    if (!producto.id) return;
    const nuevo = !(producto.activo ?? true);
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.productosService.setActivo(producto.id, nuevo);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo actualizar el producto');
        return;
      }
      await this.cargar();
    } catch (e) {
      console.error('Error toggle activo producto:', e);
      this.toast.showError('Error', 'Error actualizando el producto');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}
