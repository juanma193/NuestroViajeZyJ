import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import type { MovimientoStock } from '../../../core/models/movimiento-stock.model';
import type { EstadoVenta, VentaEmprendimiento } from '../../../core/models/venta-emprendimiento.model';
import type { VentaDetalleEmprendimiento } from '../../../core/models/venta-detalle-emprendimiento.model';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';
import {
  CANALES_VENTA,
  ESTADOS_VENTA,
  MEDIOS_PAGO,
  formatMoney,
  getEstadoVentaClass,
  getEstadoVentaLabel,
} from '../../../core/services/emprendimiento-ventas.helpers';
import { StockEmprendimientoService } from '../../../core/services/stock-emprendimiento.service';
import { VentasEmprendimientoService } from '../../../core/services/ventas-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';
import { AgregarProductoVentaModalComponent } from '../ventas/agregar-producto-venta-modal/agregar-producto-venta-modal.component';

@Component({
  selector: 'app-emprendimiento-venta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NonNegativeNumberDirective,
    AgregarProductoVentaModalComponent,
  ],
  templateUrl: './emprendimiento-venta-detalle.component.html',
})
export class EmprendimientoVentaDetalleComponent implements OnInit {
  ventaId?: number;
  venta: VentaEmprendimiento | null = null;
  detalles: VentaDetalleEmprendimiento[] = [];
  movimientos: MovimientoStock[] = [];

  cargando = false;
  mostrandoAgregarProducto = false;
  editandoCabecera = false;

  estados = ESTADOS_VENTA;
  canales = CANALES_VENTA;
  mediosPago = MEDIOS_PAGO;

  formCabecera = this.getFormCabeceraInicial();

  constructor(
    private route: ActivatedRoute,
    private ventasService: VentasEmprendimientoService,
    private stockService: StockEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) {
      this.toast.showError('Error', 'Venta inválida');
      return;
    }
    this.ventaId = id;
    await this.cargar();
  }

  get bloqueada(): boolean {
    return !!this.venta && (this.venta.stock_descontado || this.venta.estado === 'cancelado');
  }

  get puedeConfirmar(): boolean {
    return !!this.venta && !this.venta.stock_descontado && this.venta.estado !== 'cancelado' && this.detalles.length > 0;
  }

  getFormCabeceraInicial() {
    return {
      cliente_nombre: '',
      fecha: '',
      estado: 'pendiente' as EstadoVenta,
      canal_venta: '',
      medio_pago: '',
      descuento: 0,
      recargo: 0,
      envio: 0,
      observaciones: '',
    };
  }

  async cargar() {
    if (!this.ventaId) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [{ venta, detalles }, movimientos] = await Promise.all([
        this.ventasService.getVentaConDetalles(this.ventaId),
        this.stockService.getMovimientosByVenta(this.ventaId),
      ]);
      this.venta = venta;
      this.detalles = detalles;
      this.movimientos = movimientos;
      if (venta) this.cargarFormCabecera(venta);
    } catch (e) {
      console.error('Error cargando venta:', e);
      this.toast.showError('Error', 'No se pudo cargar la venta');
      this.venta = null;
      this.detalles = [];
      this.movimientos = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  cargarFormCabecera(venta: VentaEmprendimiento) {
    this.formCabecera = {
      cliente_nombre: venta.cliente_nombre ?? '',
      fecha: venta.fecha,
      estado: venta.estado,
      canal_venta: venta.canal_venta ?? '',
      medio_pago: venta.medio_pago ?? '',
      descuento: Number(venta.descuento ?? 0),
      recargo: Number(venta.recargo ?? 0),
      envio: Number(venta.envio ?? 0),
      observaciones: venta.observaciones ?? '',
    };
  }

  abrirAgregarProducto() {
    if (this.bloqueada) {
      this.toast.showWarning('Venta bloqueada', 'No se pueden agregar productos a esta venta');
      return;
    }
    this.mostrandoAgregarProducto = true;
  }

  cerrarAgregarProducto() {
    this.mostrandoAgregarProducto = false;
  }

  async guardarCabecera() {
    if (!this.venta?.id) return;
    if (!this.formCabecera.fecha) {
      this.toast.showWarning('Falta información', 'La fecha es obligatoria');
      return;
    }

    if (this.formCabecera.estado === 'cancelado') {
      await this.cancelarVenta();
      return;
    }

    const descuento = Number(this.formCabecera.descuento ?? 0);
    const recargo = Number(this.formCabecera.recargo ?? 0);
    const envio = Number(this.formCabecera.envio ?? 0);
    if ([descuento, recargo, envio].some((v) => !Number.isFinite(v) || v < 0)) {
      this.toast.showWarning('Revisar datos', 'Descuento, recargo y envío deben ser mayores o iguales a 0');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const venta = await this.ventasService.updateVenta(this.venta.id, {
        cliente_nombre: this.formCabecera.cliente_nombre.trim() || null,
        fecha: this.formCabecera.fecha,
        estado: this.formCabecera.estado,
        canal_venta: this.formCabecera.canal_venta || null,
        medio_pago: this.formCabecera.medio_pago || null,
        descuento,
        recargo,
        envio,
        observaciones: this.formCabecera.observaciones.trim() || null,
      });

      if (!venta) {
        this.toast.showError('Error', 'No se pudo guardar la venta');
        return;
      }

      await this.ventasService.recalcularVenta(this.venta.id);
      this.toast.showSuccess('Éxito', 'Venta guardada');
      this.editandoCabecera = false;
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async confirmarVenta() {
    if (!this.venta?.id) return;
    if (this.detalles.length === 0) {
      this.toast.showWarning('Venta sin productos', 'Agregá productos antes de confirmar');
      return;
    }
    if (this.venta.stock_descontado) {
      this.toast.showWarning('Venta ya confirmada', 'El stock ya fue descontado');
      return;
    }
    if (this.venta.estado === 'cancelado') {
      this.toast.showWarning('Venta cancelada', 'No se puede confirmar una venta cancelada');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const res = await this.ventasService.confirmarVentaYDescontarStock(this.venta.id);
      if (!res.ok) {
        this.toast.showError('Stock insuficiente', this.errorStock(res.error));
        return;
      }
      this.toast.showSuccess('Éxito', 'Venta confirmada y stock descontado');
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cancelarVenta() {
    if (!this.venta?.id || this.venta.estado === 'cancelado') return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const teniaStock = this.venta.stock_descontado;
      const res = await this.ventasService.cancelarVentaYReponerStock(this.venta.id);
      if (!res.ok) {
        this.toast.showError('Error', 'No se pudo cancelar la venta');
        return;
      }
      this.toast.showSuccess('Éxito', teniaStock ? 'Stock repuesto correctamente' : 'Venta cancelada');
      this.editandoCabecera = false;
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async cambiarEstado(estado: EstadoVenta) {
    if (!this.venta?.id || this.venta.estado === estado) return;
    if (estado === 'cancelado') {
      await this.cancelarVenta();
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const venta = await this.ventasService.cambiarEstadoVenta(this.venta.id, estado);
      if (!venta) {
        this.toast.showError('Error', 'No se pudo cambiar el estado');
        return;
      }
      this.toast.showSuccess('Éxito', 'Estado actualizado');
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarDetalle(detalle: VentaDetalleEmprendimiento) {
    if (!detalle.id || this.bloqueada) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.ventasService.deleteDetalleVenta(detalle.id);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo eliminar el producto');
        return;
      }
      this.toast.showSuccess('Éxito', 'Producto eliminado');
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  gananciaLinea(detalle: VentaDetalleEmprendimiento): number {
    return Number(detalle.precio_total ?? 0) - Number(detalle.costo_total ?? 0);
  }

  getEstadoVentaLabel = getEstadoVentaLabel;
  getEstadoVentaClass = getEstadoVentaClass;
  formatMoney = formatMoney;

  formatFecha(value: string | null | undefined, incluirHora = false): string {
    if (!value) return '-';
    if (!incluirHora && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yyyy, mm, dd] = value.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (!incluirHora) return `${dd}/${mm}/${yyyy}`;
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  private errorStock(message?: string): string {
    const lower = (message ?? '').toLowerCase();
    if (lower.includes('stock')) return 'Stock insuficiente para completar la venta';
    return message || 'No se pudo confirmar la venta';
  }
}
