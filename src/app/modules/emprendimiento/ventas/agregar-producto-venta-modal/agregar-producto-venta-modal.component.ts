import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Producto } from '../../../../core/models/producto.model';
import type { VentaEmprendimiento } from '../../../../core/models/venta-emprendimiento.model';
import { NonNegativeNumberDirective } from '../../../../core/directives/non-negative-number.directive';
import { calcularLineaVenta, formatMoney } from '../../../../core/services/emprendimiento-ventas.helpers';
import { ProductosService } from '../../../../core/services/productos.service';
import { ToastService } from '../../../../core/toast/services/toast.service';
import { VentasEmprendimientoService } from '../../../../core/services/ventas-emprendimiento.service';

@Component({
  selector: 'app-agregar-producto-venta-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NonNegativeNumberDirective],
  templateUrl: './agregar-producto-venta-modal.component.html',
})
export class AgregarProductoVentaModalComponent implements OnInit {
  @Input({ required: true }) venta!: VentaEmprendimiento;
  @Output() cerrar = new EventEmitter<void>();
  @Output() agregado = new EventEmitter<void>();

  productos: Producto[] = [];
  cargando = false;
  guardando = false;

  form = {
    producto_id: null as number | null,
    cantidad: 1,
    precio_unitario: 0,
    observaciones: '',
  };

  constructor(
    private productosService: ProductosService,
    private ventasService: VentasEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargarProductos();
  }

  get productoSeleccionado(): Producto | null {
    if (!this.form.producto_id) return null;
    return this.productos.find((p) => p.id === this.form.producto_id) ?? null;
  }

  get lineaPreview() {
    const producto = this.productoSeleccionado;
    if (!producto) return null;
    return calcularLineaVenta(producto, Number(this.form.cantidad), Number(this.form.precio_unitario));
  }

  async cargarProductos() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.productos = await this.productosService.getProductosActivos();
    } catch (e) {
      console.error('Error cargando productos:', e);
      this.toast.showError('Error', 'No se pudieron cargar los productos');
      this.productos = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  onProductoChange() {
    const producto = this.productoSeleccionado;
    if (!producto) return;
    this.form.precio_unitario = Number(producto.precio_manual ?? producto.precio_sugerido ?? 0);
  }

  onCerrar() {
    if (this.guardando) return;
    this.cerrar.emit();
  }

  async guardar() {
    if (this.venta.stock_descontado || this.venta.estado === 'cancelado') {
      this.toast.showWarning('Venta bloqueada', 'No se pueden agregar productos a esta venta');
      return;
    }

    if (!this.form.producto_id) {
      this.toast.showWarning('Falta información', 'Seleccioná un producto');
      return;
    }

    const cantidad = Number(this.form.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.toast.showWarning('Revisar datos', 'La cantidad debe ser mayor a 0');
      return;
    }

    const precio = Number(this.form.precio_unitario);
    if (!Number.isFinite(precio) || precio < 0) {
      this.toast.showWarning('Revisar datos', 'El precio unitario debe ser mayor o igual a 0');
      return;
    }

    try {
      this.guardando = true;
      this.cdr.detectChanges();
      const detalle = await this.ventasService.addProductoAVenta({
        venta: this.venta,
        producto_id: this.form.producto_id,
        cantidad,
        precio_unitario: precio,
        observaciones: this.form.observaciones.trim() || null,
      });

      if (!detalle) {
        this.toast.showError('Error', 'No se pudo agregar el producto a la venta');
        return;
      }

      this.toast.showSuccess('Éxito', 'Producto agregado a la venta');
      this.agregado.emit();
      this.cerrar.emit();
    } catch (e) {
      console.error('Error agregando producto a venta:', e);
      this.toast.showError('Error', 'No se pudo agregar el producto a la venta');
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }

  formatMoney = formatMoney;
}
