import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import type { CompraEmprendimiento } from '../../../core/models/compra-emprendimiento.model';
import type { ProveedorEmprendimiento } from '../../../core/models/proveedor-emprendimiento.model';
import { ComprasEmprendimientoService } from '../../../core/services/compras-emprendimiento.service';
import { ProveedoresEmprendimientoService } from '../../../core/services/proveedores-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-emprendimiento-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './emprendimiento-compras.component.html',
})
export class EmprendimientoComprasComponent implements OnInit {
  compras: CompraEmprendimiento[] = [];
  proveedores: ProveedorEmprendimiento[] = [];
  cargando = false;

  buscar = '';
  mostrarInactivas = false;
  mostrandoFormulario = false;

  form = this.getFormInicial();

  constructor(
    private comprasService: ComprasEmprendimientoService,
    private proveedoresService: ProveedoresEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get comprasFiltradas(): CompraEmprendimiento[] {
    const buscar = this.buscar.trim().toLowerCase();
    return (this.compras ?? []).filter((c) => {
      if (!this.mostrarInactivas && !(c.activo ?? true)) return false;
      if (!buscar) return true;
      const proveedor = (c.proveedor_nombre ?? '').toLowerCase();
      const observaciones = (c.observaciones ?? '').toLowerCase();
      return proveedor.includes(buscar) || observaciones.includes(buscar);
    });
  }

  get proveedoresActivos(): ProveedorEmprendimiento[] {
    return (this.proveedores ?? []).filter((p) => p.activo ?? true);
  }

  getFormInicial() {
    return {
      fecha: this.today(),
      proveedor_id: null as number | null,
      proveedor_nombre: '',
      observaciones: '',
    };
  }

  today(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [compras, proveedores] = await Promise.all([
        this.comprasService.getCompras(),
        this.proveedoresService.getProveedores(),
      ]);
      this.compras = compras;
      this.proveedores = proveedores;
    } catch (e) {
      console.error('Error cargando compras:', e);
      this.toast.showError('Error', 'No se pudieron cargar las compras');
      this.compras = [];
      this.proveedores = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirNueva() {
    this.form = this.getFormInicial();
    this.mostrandoFormulario = true;
  }

  cerrarFormulario() {
    this.form = this.getFormInicial();
    this.mostrandoFormulario = false;
  }

  proveedorSeleccionado(): ProveedorEmprendimiento | null {
    if (!this.form.proveedor_id) return null;
    return this.proveedores.find((p) => p.id === this.form.proveedor_id) ?? null;
  }

  async crearCompra() {
    if (!this.form.fecha) {
      this.toast.showWarning('Falta información', 'La fecha es obligatoria');
      return;
    }

    const proveedor = this.proveedorSeleccionado();
    const proveedorNombre = proveedor?.nombre ?? this.form.proveedor_nombre.trim() ?? '';

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const creada = await this.comprasService.createCompra({
        fecha: this.form.fecha,
        proveedor_id: proveedor?.id ?? null,
        proveedor_nombre: proveedorNombre || null,
        observaciones: this.form.observaciones.trim() || null,
        activo: true,
        total: 0,
      });

      if (!creada) {
        this.toast.showError('Error', 'No se pudo crear la compra');
        return;
      }

      this.toast.showSuccess('Éxito', 'Compra creada');
      this.cerrarFormulario();
      await this.cargar();
    } catch (e) {
      console.error('Error creando compra:', e);
      this.toast.showError('Error', 'No se pudo crear la compra');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async desactivarCompra(compra: CompraEmprendimiento) {
    if (!compra.id) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.comprasService.deleteCompra(compra.id);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo desactivar la compra');
        return;
      }
      await this.cargar();
    } catch (e) {
      console.error('Error desactivando compra:', e);
      this.toast.showError('Error', 'No se pudo desactivar la compra');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    const [yyyy, mm, dd] = value.split('-');
    if (!yyyy || !mm || !dd) return value;
    return `${dd}/${mm}/${yyyy}`;
  }
}
