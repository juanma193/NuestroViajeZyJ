import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ProveedorEmprendimiento } from '../../../core/models/proveedor-emprendimiento.model';
import { ProveedoresEmprendimientoService } from '../../../core/services/proveedores-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-emprendimiento-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emprendimiento-proveedores.component.html',
})
export class EmprendimientoProveedoresComponent implements OnInit {
  @ViewChild('formularioProveedor') formularioProveedor?: ElementRef<HTMLElement>;

  proveedores: ProveedorEmprendimiento[] = [];
  cargando = false;

  buscar = '';
  mostrarInactivos = true;
  mostrandoFormulario = false;
  editandoId?: number;

  form = this.getFormInicial();

  constructor(
    private proveedoresService: ProveedoresEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get proveedoresFiltrados(): ProveedorEmprendimiento[] {
    const buscar = this.buscar.trim().toLowerCase();
    return (this.proveedores ?? []).filter((p) => {
      if (!this.mostrarInactivos && !(p.activo ?? true)) return false;
      if (buscar && !(p.nombre ?? '').toLowerCase().includes(buscar)) return false;
      return true;
    });
  }

  getFormInicial() {
    return {
      nombre: '',
      telefono: '',
      instagram: '',
      direccion: '',
      notas: '',
      activo: true,
    };
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.proveedores = await this.proveedoresService.getProveedores();
    } catch (e) {
      console.error('Error cargando proveedores:', e);
      this.toast.showError('Error', 'No se pudieron cargar los proveedores');
      this.proveedores = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirNuevo() {
    this.editandoId = undefined;
    this.form = this.getFormInicial();
    this.mostrandoFormulario = true;
    this.scrollFormulario();
  }

  abrirEditar(proveedor: ProveedorEmprendimiento) {
    this.editandoId = proveedor.id;
    this.form = {
      nombre: proveedor.nombre ?? '',
      telefono: proveedor.telefono ?? '',
      instagram: proveedor.instagram ?? '',
      direccion: proveedor.direccion ?? '',
      notas: proveedor.notas ?? '',
      activo: proveedor.activo ?? true,
    };
    this.mostrandoFormulario = true;
    this.scrollFormulario();
  }

  private scrollFormulario() {
    setTimeout(() => {
      const element = this.formularioProveedor?.nativeElement;
      if (!element) return;

      const navbarOffset = 140;
      const top = element.getBoundingClientRect().top + window.scrollY - navbarOffset;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: 'smooth',
      });
    });
  }

  cerrarFormulario() {
    this.editandoId = undefined;
    this.form = this.getFormInicial();
    this.mostrandoFormulario = false;
  }

  async guardar() {
    const nombre = this.form.nombre.trim();
    if (!nombre) {
      this.toast.showWarning('Falta información', 'El nombre es obligatorio');
      return;
    }

    const payload = {
      nombre,
      telefono: this.form.telefono.trim() || null,
      instagram: this.form.instagram.trim() || null,
      direccion: this.form.direccion.trim() || null,
      notas: this.form.notas.trim() || null,
      activo: this.form.activo,
    };

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const guardado = this.editandoId
        ? await this.proveedoresService.updateProveedor(this.editandoId, payload)
        : await this.proveedoresService.createProveedor(payload);

      if (!guardado) {
        this.toast.showError('Error', 'No se pudo guardar el proveedor');
        return;
      }

      this.toast.showSuccess('Éxito', 'Proveedor guardado');
      this.cerrarFormulario();
      await this.cargar();
    } catch (e) {
      console.error('Error guardando proveedor:', e);
      this.toast.showError('Error', 'No se pudo guardar el proveedor');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleActivo(proveedor: ProveedorEmprendimiento) {
    if (!proveedor.id) return;
    const activo = !(proveedor.activo ?? true);

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.proveedoresService.toggleProveedorActivo(proveedor.id, activo);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo actualizar el proveedor');
        return;
      }
      await this.cargar();
    } catch (e) {
      console.error('Error actualizando proveedor:', e);
      this.toast.showError('Error', 'No se pudo actualizar el proveedor');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}
