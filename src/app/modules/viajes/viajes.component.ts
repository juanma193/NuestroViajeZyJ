import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalViajeComponent } from './modal-viaje/modal-viaje.component';
import { ModalConfirmComponent } from '../peliculas/modal-confirm/modal-confirm.component';
import { ViajesService } from '../../core/services/viajes.service';
import { Viaje } from '../../core/models/viaje.model';
import { ToastService } from '../../core/toast/services/toast.service';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, ModalViajeComponent, ModalConfirmComponent],
  templateUrl: './viajes.component.html',
})
export class ViajesComponent implements OnInit {
  viajes: Viaje[] = [];
  cargando = true;
  mostrarModal = false;
  mostrarModalConfirm = false;
  viajeAEliminarId?: number;
  viajeAEliminarNombre = '';

  constructor(
    private viajesService: ViajesService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    await this.cargarViajes();
  }

  async cargarViajes() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.viajes = await this.viajesService.obtenerViajes();
    } catch (error) {
      console.error('Error cargando viajes:', error);
      this.viajes = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  async agregarViaje(viaje: Omit<Viaje, 'id' | 'created_at'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const res = await this.viajesService.agregarViaje(viaje);
      if (res) {
        this.cerrarModal();
        await this.cargarViajes();
        this.toastService.showSuccess('Éxito', 'Viaje creado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo guardar el viaje');
      }
    } catch (error) {
      console.error('Error agregando viaje:', error);
      alert('Error al guardar el viaje');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalConfirm(id?: number, nombre?: string) {
    this.viajeAEliminarId = id;
    this.viajeAEliminarNombre = nombre || '';
    this.mostrarModalConfirm = true;
  }

  cerrarModalConfirm() {
    this.mostrarModalConfirm = false;
    this.viajeAEliminarId = undefined;
    this.viajeAEliminarNombre = '';
  }

  async confirmarEliminar() {
    if (this.viajeAEliminarId) {
      const idAEliminar = this.viajeAEliminarId;
      this.cerrarModalConfirm();
      try {
        this.cargando = true;
        this.cdr.detectChanges();
        const exito = await this.viajesService.eliminarViaje(idAEliminar);
        if (exito) {
          await this.cargarViajes();
          this.toastService.showSuccess('Éxito', 'Viaje eliminado correctamente');
        } else {
          this.toastService.showError('Error', 'No se pudo eliminar el viaje');
        }
      } catch (error) {
        console.error('Error eliminando viaje:', error);
        this.toastService.showError('Error', 'Error eliminando el viaje');
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  async toggleEstado(viaje: Viaje) {
    if (!viaje.id) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      await this.viajesService.actualizarViaje(viaje.id, { estado: !viaje.estado });
      await this.cargarViajes();
    } catch (error) {
      console.error('Error actualizando estado del viaje:', error);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }
}
