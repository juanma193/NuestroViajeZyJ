import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import type { ClienteEmprendimiento } from '../../../core/models/cliente-emprendimiento.model';
import type { EstadoVenta, VentaEmprendimiento } from '../../../core/models/venta-emprendimiento.model';
import { ClientesEmprendimientoService } from '../../../core/services/clientes-emprendimiento.service';
import {
  CANALES_VENTA,
  ESTADOS_VENTA,
  MEDIOS_PAGO,
  formatMoney,
  getEstadoVentaClass,
  getEstadoVentaLabel,
} from '../../../core/services/emprendimiento-ventas.helpers';
import { VentasEmprendimientoService } from '../../../core/services/ventas-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';

@Component({
  selector: 'app-emprendimiento-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NonNegativeNumberDirective],
  templateUrl: './emprendimiento-ventas.component.html',
})
export class EmprendimientoVentasComponent implements OnInit {
  @ViewChild('formularioVenta') formularioVenta?: ElementRef<HTMLElement>;

  ventas: VentaEmprendimiento[] = [];
  clientes: ClienteEmprendimiento[] = [];
  cargando = false;
  mostrandoFormulario = false;

  estados = ESTADOS_VENTA;
  canales = CANALES_VENTA;
  mediosPago = MEDIOS_PAGO;

  filtros = {
    cliente: '',
    estado: 'todos' as EstadoVenta | 'todos',
    canal_venta: '',
    medio_pago: '',
    fecha_desde: '',
    fecha_hasta: '',
  };

  form = this.getFormInicial();

  constructor(
    private ventasService: VentasEmprendimientoService,
    private clientesService: ClientesEmprendimientoService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get clientesActivos(): ClienteEmprendimiento[] {
    return (this.clientes ?? []).filter((c) => c.activo ?? true);
  }

  getFormInicial() {
    return {
      cliente_id: null as number | null,
      cliente_nombre: '',
      fecha: this.today(),
      canal_venta: '',
      medio_pago: '',
      descuento: 0,
      recargo: 0,
      envio: 0,
      observaciones: '',
    };
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [ventas, clientes] = await Promise.all([
        this.ventasService.getVentas(undefined, {
          cliente: this.filtros.cliente,
          estado: this.filtros.estado,
          canal_venta: this.filtros.canal_venta || null,
          medio_pago: this.filtros.medio_pago || null,
          fecha_desde: this.filtros.fecha_desde || null,
          fecha_hasta: this.filtros.fecha_hasta || null,
        }),
        this.clientesService.getClientes(),
      ]);
      this.ventas = ventas;
      this.clientes = clientes;
    } catch (e) {
      console.error('Error cargando ventas:', e);
      this.toast.showError('Error', 'No se pudieron cargar las ventas');
      this.ventas = [];
      this.clientes = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirNueva() {
    this.form = this.getFormInicial();
    this.mostrandoFormulario = true;
    this.scrollFormulario();
  }

  cerrarFormulario() {
    this.form = this.getFormInicial();
    this.mostrandoFormulario = false;
  }

  clienteSeleccionado(): ClienteEmprendimiento | null {
    if (!this.form.cliente_id) return null;
    return this.clientes.find((c) => c.id === this.form.cliente_id) ?? null;
  }

  async crearVenta() {
    if (!this.form.fecha) {
      this.toast.showWarning('Falta información', 'La fecha es obligatoria');
      return;
    }

    const descuento = Number(this.form.descuento ?? 0);
    const recargo = Number(this.form.recargo ?? 0);
    const envio = Number(this.form.envio ?? 0);
    if ([descuento, recargo, envio].some((v) => !Number.isFinite(v) || v < 0)) {
      this.toast.showWarning('Revisar datos', 'Descuento, recargo y envío deben ser mayores o iguales a 0');
      return;
    }

    const cliente = this.clienteSeleccionado();
    const clienteNombre = cliente?.nombre ?? this.form.cliente_nombre.trim() ?? '';

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const venta = await this.ventasService.createVenta({
        cliente_id: cliente?.id ?? null,
        cliente_nombre: clienteNombre || null,
        fecha: this.form.fecha,
        canal_venta: this.form.canal_venta || null,
        medio_pago: this.form.medio_pago || null,
        descuento,
        recargo,
        envio,
        observaciones: this.form.observaciones.trim() || null,
      });

      if (!venta?.id) {
        this.toast.showError('Error', 'No se pudo guardar la venta');
        return;
      }

      this.toast.showSuccess('Éxito', 'Venta creada correctamente');
      await this.router.navigate(['/emprendimiento/ventas', venta.id]);
    } catch (e) {
      console.error('Error creando venta:', e);
      this.toast.showError('Error', 'No se pudo guardar la venta');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async confirmarVenta(venta: VentaEmprendimiento) {
    if (!venta.id || venta.stock_descontado || venta.estado === 'cancelado') return;
    if (Number(venta.subtotal ?? 0) <= 0) {
      this.toast.showWarning('Venta sin productos', 'Agregá productos antes de confirmar');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const res = await this.ventasService.confirmarVentaYDescontarStock(venta.id);
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

  async cancelarVenta(venta: VentaEmprendimiento) {
    if (!venta.id || venta.estado === 'cancelado') return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const res = await this.ventasService.cancelarVentaYReponerStock(venta.id);
      if (!res.ok) {
        this.toast.showError('Error', 'No se pudo cancelar la venta');
        return;
      }
      this.toast.showSuccess('Éxito', venta.stock_descontado ? 'Stock repuesto correctamente' : 'Venta cancelada');
      await this.cargar();
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async onCambiarEstado(venta: VentaEmprendimiento, estado: EstadoVenta) {
    if (!venta.id || venta.estado === estado) return;
    if (estado === 'cancelado') {
      await this.cancelarVenta(venta);
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const actualizada = await this.ventasService.cambiarEstadoVenta(venta.id, estado);
      if (!actualizada) {
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

  getEstadoVentaLabel = getEstadoVentaLabel;
  getEstadoVentaClass = getEstadoVentaClass;
  formatMoney = formatMoney;

  formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    const [yyyy, mm, dd] = value.split('-');
    if (!yyyy || !mm || !dd) return value;
    return `${dd}/${mm}/${yyyy}`;
  }

  private errorStock(message?: string): string {
    const lower = (message ?? '').toLowerCase();
    if (lower.includes('stock')) return 'Stock insuficiente para completar la venta';
    return message || 'No se pudo confirmar la venta';
  }

  private today(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private scrollFormulario() {
    setTimeout(() => {
      const element = this.formularioVenta?.nativeElement;
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    });
  }
}
