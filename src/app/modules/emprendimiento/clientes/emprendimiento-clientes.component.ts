import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ClienteEmprendimiento } from '../../../core/models/cliente-emprendimiento.model';
import { ClientesEmprendimientoService } from '../../../core/services/clientes-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-emprendimiento-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emprendimiento-clientes.component.html',
})
export class EmprendimientoClientesComponent implements OnInit {
  @ViewChild('formularioCliente') formularioCliente?: ElementRef<HTMLElement>;

  clientes: ClienteEmprendimiento[] = [];
  cargando = false;

  buscar = '';
  mostrarInactivos = true;
  mostrandoFormulario = false;
  editandoId?: number;

  form = this.getFormInicial();

  constructor(
    private clientesService: ClientesEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get clientesFiltrados(): ClienteEmprendimiento[] {
    const buscar = this.buscar.trim().toLowerCase();
    return (this.clientes ?? []).filter((c) => {
      if (!this.mostrarInactivos && !(c.activo ?? true)) return false;
      if (!buscar) return true;
      return [c.nombre, c.telefono, c.instagram]
        .some((value) => (value ?? '').toLowerCase().includes(buscar));
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
      this.clientes = await this.clientesService.getClientes();
    } catch (e) {
      console.error('Error cargando clientes:', e);
      this.toast.showError('Error', 'No se pudieron cargar los clientes');
      this.clientes = [];
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

  abrirEditar(cliente: ClienteEmprendimiento) {
    this.editandoId = cliente.id;
    this.form = {
      nombre: cliente.nombre ?? '',
      telefono: cliente.telefono ?? '',
      instagram: cliente.instagram ?? '',
      direccion: cliente.direccion ?? '',
      notas: cliente.notas ?? '',
      activo: cliente.activo ?? true,
    };
    this.mostrandoFormulario = true;
    this.scrollFormulario();
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
        ? await this.clientesService.updateCliente(this.editandoId, payload)
        : await this.clientesService.createCliente(payload);

      if (!guardado) {
        this.toast.showError('Error', 'No se pudo guardar el cliente');
        return;
      }

      this.toast.showSuccess('Éxito', 'Cliente guardado');
      this.cerrarFormulario();
      await this.cargar();
    } catch (e) {
      console.error('Error guardando cliente:', e);
      this.toast.showError('Error', 'No se pudo guardar el cliente');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleActivo(cliente: ClienteEmprendimiento) {
    if (!cliente.id) return;
    const activo = !(cliente.activo ?? true);

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.clientesService.toggleClienteActivo(cliente.id, activo);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo actualizar el cliente');
        return;
      }
      await this.cargar();
    } catch (e) {
      console.error('Error actualizando cliente:', e);
      this.toast.showError('Error', 'No se pudo actualizar el cliente');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  private scrollFormulario() {
    setTimeout(() => {
      const element = this.formularioCliente?.nativeElement;
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    });
  }
}
