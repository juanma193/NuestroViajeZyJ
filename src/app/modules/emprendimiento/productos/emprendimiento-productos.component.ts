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
  productoEditando: Producto | null = null;
  fotoFile: File | null = null;
  fotoPreviewUrl: string | null = null;
  fotoError = '';

  form: {
    nombre: string;
    descripcion: string;
    categoria: string;
    tiempo_produccion_minutos: number | null;
    margen_porcentaje: number | null;
    precio_manual: number | null;
    activo: boolean;
  } = this.getFormInicial();

  constructor(
    private productosService: ProductosService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
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
      tiempo_produccion_minutos: null,
      margen_porcentaje: 60,
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
    this.productoEditando = null;
    this.form = this.getFormInicial();
    this.limpiarFotoSeleccionada();
    this.mostrandoFormulario = true;
  }

  abrirEditar(producto: Producto) {
    this.editandoId = producto.id;
    this.productoEditando = producto;
    this.form = {
      nombre: producto.nombre ?? '',
      descripcion: producto.descripcion ?? '',
      categoria: producto.categoria ?? '',
      tiempo_produccion_minutos: producto.tiempo_produccion_minutos ?? null,
      margen_porcentaje: producto.margen_porcentaje ?? 0,
      precio_manual: producto.precio_manual ?? null,
      activo: producto.activo ?? true,
    };
    this.limpiarFotoSeleccionada();
    this.mostrandoFormulario = true;
  }

  cerrarFormulario() {
    this.mostrandoFormulario = false;
    this.editandoId = undefined;
    this.productoEditando = null;
    this.form = this.getFormInicial();
    this.limpiarFotoSeleccionada();
  }

  get fotoActualUrl(): string | null {
    if (this.fotoPreviewUrl) return this.fotoPreviewUrl;
    if (this.productoEditando?.foto_url) return this.productoEditando.foto_url;
    if (this.productoEditando?.foto_path) {
      return this.productosService.getProductoFotoUrl(this.productoEditando.foto_path);
    }
    return null;
  }

  fotoUrl(producto: Producto): string | null {
    return producto.foto_url || this.productosService.getProductoFotoUrl(producto.foto_path);
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.limpiarFotoSeleccionada();

    if (!file) return;

    const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!file.type.startsWith('image/') || !extensionesPermitidas.includes(extension)) {
      this.fotoError = 'Seleccioná una imagen JPG, PNG o WebP';
      input.value = '';
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.fotoError = 'La imagen no puede superar los 3MB';
      input.value = '';
      return;
    }

    this.fotoFile = file;
    this.fotoPreviewUrl = URL.createObjectURL(file);
  }

  quitarFotoSeleccionada(input?: HTMLInputElement) {
    this.limpiarFotoSeleccionada();
    if (input) input.value = '';
  }

  private limpiarFotoSeleccionada() {
    if (this.fotoPreviewUrl) {
      URL.revokeObjectURL(this.fotoPreviewUrl);
    }
    this.fotoFile = null;
    this.fotoPreviewUrl = null;
    this.fotoError = '';
  }

  async guardar() {
    const nombre = (this.form.nombre ?? '').trim();
    if (!nombre) {
      this.toast.showWarning('Falta información', 'El nombre es obligatorio');
      return;
    }

    const margen = Number(this.form.margen_porcentaje);
    if (!Number.isFinite(margen) || margen < 0) {
      this.toast.showWarning('Revisar datos', 'El margen debe ser ≥ 0');
      return;
    }

    const tiempo =
      this.form.tiempo_produccion_minutos == null
        ? null
        : Number(this.form.tiempo_produccion_minutos);
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

      const basePayload: Partial<Producto> = {
        nombre,
        descripcion: this.form.descripcion.trim() ? this.form.descripcion.trim() : null,
        categoria: this.form.categoria.trim() ? this.form.categoria.trim() : null,
        tiempo_produccion_minutos: tiempo,
        margen_porcentaje: margen,
        precio_manual: precioManual,
        activo: this.form.activo,
      };

      let res: Producto | null = null;
      if (this.editandoId) {
        // Importante: no sobrescribir costo_calculado/precio_sugerido si no estás guardando receta.
        res = await this.productosService.actualizar(this.editandoId, basePayload);
      } else {
        // Tu DB tiene costo_calculado NOT NULL, así que inicializamos en 0.
        const createPayload: Omit<Producto, 'id' | 'pareja_id'> = {
          ...(basePayload as Omit<Producto, 'id' | 'pareja_id'>),
          costo_calculado: 0,
          precio_sugerido: 0,
        };
        res = await this.productosService.crear(createPayload);
      }

      if (!res) {
        this.toast.showError('Error', 'No se pudo guardar el producto');
        return;
      }

      if (this.fotoFile && res.id) {
        const fotoOk = await this.guardarFotoProducto(res);
        if (!fotoOk) {
          this.toast.showError('Error', 'El producto se guardó, pero no se pudo subir la foto');
          await this.cargar();
          return;
        }
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

  private async guardarFotoProducto(producto: Producto): Promise<boolean> {
    if (!producto.id || !this.fotoFile) return true;

    const fotoAnteriorPath = this.productoEditando?.foto_path ?? null;
    const subida = await this.productosService.uploadProductoFoto(
      producto.id,
      producto.pareja_id,
      this.fotoFile,
    );

    if (!subida) return false;

    const actualizado = await this.productosService.updateProductoFoto(
      producto.id,
      subida.path,
      subida.publicUrl,
    );

    if (!actualizado) {
      await this.productosService.deleteProductoFoto(subida.path);
      return false;
    }

    if (fotoAnteriorPath && fotoAnteriorPath !== subida.path) {
      await this.productosService.deleteProductoFoto(fotoAnteriorPath);
    }

    return true;
  }
}
