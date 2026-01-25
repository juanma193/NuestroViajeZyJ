import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalViajeComponent } from './modal-viaje/modal-viaje.component';
import { ModalConfirmComponent } from '../peliculas/modal-confirm/modal-confirm.component';
import { ModalVueloComponent } from './modal-vuelo/modal-vuelo.component';
import { ModalAlojamientoComponent } from './modal-alojamiento/modal-alojamiento.component';
import { ModalActividadComponent } from './modal-actividad/modal-actividad.component';
import { ViajesService } from '../../core/services/viajes.service';
import { VuelosService } from '../../core/services/vuelos.service';
import { AlojamientosService } from '../../core/services/alojamientos.service';
import { ActividadesViajeService } from '../../core/services/actividades-viaje.service';
import { Viaje } from '../../core/models/viaje.model';
import { Vuelo } from '../../core/models/vuelo.model';
import { Alojamiento } from '../../core/models/alojamiento.model';
import { ActividadViaje } from '../../core/models/actividad-viaje.model';
import { ToastService } from '../../core/toast/services/toast.service';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, ModalViajeComponent, ModalConfirmComponent, ModalVueloComponent, ModalAlojamientoComponent, ModalActividadComponent],
  templateUrl: './viajes.component.html',
})
export class ViajesComponent implements OnInit {
  viajes: Viaje[] = [];
  cargando = true;
  mostrarModal = false;
  mostrarModalConfirm = false;
  viajeAEliminarId?: number;
  viajeAEliminarNombre = '';
  viajeExpandidoId?: number;

  // Datos de vuelos, alojamientos y actividades por viaje
  vuelosPorViaje: Map<number, Vuelo[]> = new Map();
  alojamientosPorViaje: Map<number, Alojamiento[]> = new Map();
  actividadesPorViaje: Map<number, ActividadViaje[]> = new Map();

  // Control de modales
  mostrarModalVuelo = false;
  mostrarModalAlojamiento = false;
  mostrarModalActividad = false;
  viajeIdActual?: number;
  viajeEnEdicion?: Viaje;
  vueloEnEdicion?: Vuelo;
  alojamientoEnEdicion?: Alojamiento;
  actividadEnEdicion?: ActividadViaje;
  fechaInicioViajeActual?: string;

  // Modales de confirmación para eliminar
  mostrarModalConfirmVuelo = false;
  vueloAEliminarId?: number;
  mostrarModalConfirmAlojamiento = false;
  alojamientoAEliminarId?: number;
  mostrarModalConfirmActividad = false;
  actividadAEliminarId?: number;

  constructor(
    private viajesService: ViajesService,
    private vuelosService: VuelosService,
    private alojamientosService: AlojamientosService,
    private actividadesViajeService: ActividadesViajeService,
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
      const viajes = await this.viajesService.obtenerViajes();
      this.viajes = viajes.sort((a, b) => {
        const aPendiente = a.estado === false ? 0 : 1;
        const bPendiente = b.estado === false ? 0 : 1;
        if (aPendiente !== bPendiente) {
          return aPendiente - bPendiente;
        }
        const aKey = a.fecha_desde ?? '';
        const bKey = b.fecha_desde ?? '';
        return aKey.localeCompare(bKey);
      });
    } catch (error) {
      console.error('Error cargando viajes:', error);
      this.viajes = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirModal() {
    this.viajeEnEdicion = undefined;
    this.mostrarModal = true;
  }

  abrirModalEditar(viaje: Viaje) {
    this.viajeEnEdicion = viaje;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.viajeEnEdicion = undefined;
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

  async actualizarViaje(data: {id: number, viaje: Partial<Viaje>}) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.viajesService.actualizarViaje(data.id, data.viaje);
      if (exito) {
        this.cerrarModal();
        await this.cargarViajes();
        this.toastService.showSuccess('Éxito', 'Viaje actualizado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo actualizar el viaje');
      }
    } catch (error) {
      console.error('Error actualizando viaje:', error);
      this.toastService.showError('Error', 'Error al actualizar el viaje');
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

  async toggleExpansion(viajeId?: number) {
    if (this.viajeExpandidoId === viajeId) {
      this.viajeExpandidoId = undefined;
    } else {
      this.viajeExpandidoId = viajeId;
      if (viajeId) {
        await this.cargarDatosViaje(viajeId);
      }
    }
  }

  estaExpandido(viajeId?: number): boolean {
    return this.viajeExpandidoId === viajeId;
  }

  async cargarDatosViaje(viajeId: number) {
    try {
      const [vuelos, alojamientos, actividades] = await Promise.all([
        this.vuelosService.obtenerVuelosPorViaje(viajeId),
        this.alojamientosService.obtenerAlojamientosPorViaje(viajeId),
        this.actividadesViajeService.obtenerActividadesPorViaje(viajeId)
      ]);

      this.vuelosPorViaje.set(viajeId, vuelos);
      this.alojamientosPorViaje.set(viajeId, alojamientos);
      this.actividadesPorViaje.set(viajeId, actividades);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error cargando datos del viaje:', error);
    }
  }

  // Métodos para vuelos
  abrirModalVuelo(viajeId: number) {
    this.viajeIdActual = viajeId;
    this.vueloEnEdicion = undefined;
    this.mostrarModalVuelo = true;
  }

  abrirModalEditarVuelo(vuelo: Vuelo) {
    this.viajeIdActual = vuelo.viaje_id;
    this.vueloEnEdicion = vuelo;
    this.mostrarModalVuelo = true;
  }

  cerrarModalVuelo() {
    this.mostrarModalVuelo = false;
    this.viajeIdActual = undefined;
    this.vueloEnEdicion = undefined;
  }

  async agregarVuelo(vuelo: Omit<Vuelo, 'id' | 'created_at'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.vuelosService.agregarVuelo(vuelo);
      if (exito) {
        this.cerrarModalVuelo();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Vuelo agregado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo agregar el vuelo');
      }
    } catch (error) {
      console.error('Error agregando vuelo:', error);
      this.toastService.showError('Error', 'Error al guardar el vuelo');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async actualizarVuelo(data: {id: number, vuelo: Partial<Vuelo>}) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.vuelosService.actualizarVuelo(data.id, data.vuelo);
      if (exito) {
        this.cerrarModalVuelo();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Vuelo actualizado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo actualizar el vuelo');
      }
    } catch (error) {
      console.error('Error actualizando vuelo:', error);
      this.toastService.showError('Error', 'Error al actualizar el vuelo');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarVuelo(vueloId: number) {
    this.vueloAEliminarId = vueloId;
    this.mostrarModalConfirmVuelo = true;
  }

  cerrarModalConfirmVuelo() {
    this.mostrarModalConfirmVuelo = false;
    this.vueloAEliminarId = undefined;
  }

  async confirmarEliminarVuelo() {
    if (this.vueloAEliminarId) {
      const idAEliminar = this.vueloAEliminarId;
      this.cerrarModalConfirmVuelo();
      try {
        this.cargando = true;
        this.cdr.detectChanges();
        const exito = await this.vuelosService.eliminarVuelo(idAEliminar);
        if (exito) {
          if (this.viajeExpandidoId) {
            await this.cargarDatosViaje(this.viajeExpandidoId);
          }
          this.toastService.showSuccess('Éxito', 'Vuelo eliminado correctamente');
        } else {
          this.toastService.showError('Error', 'No se pudo eliminar el vuelo');
        }
      } catch (error) {
        console.error('Error eliminando vuelo:', error);
        this.toastService.showError('Error', 'Error al eliminar el vuelo');
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  // Métodos para alojamientos
  abrirModalAlojamiento(viajeId: number) {
    this.viajeIdActual = viajeId;
    this.alojamientoEnEdicion = undefined;
    this.mostrarModalAlojamiento = true;
  }

  abrirModalEditarAlojamiento(alojamiento: Alojamiento) {
    this.viajeIdActual = alojamiento.viaje_id;
    this.alojamientoEnEdicion = alojamiento;
    this.mostrarModalAlojamiento = true;
  }

  cerrarModalAlojamiento() {
    this.mostrarModalAlojamiento = false;
    this.viajeIdActual = undefined;
    this.alojamientoEnEdicion = undefined;
  }

  async agregarAlojamiento(alojamiento: Omit<Alojamiento, 'id' | 'created_at'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.alojamientosService.agregarAlojamiento(alojamiento);
      if (exito) {
        this.cerrarModalAlojamiento();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Alojamiento agregado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo agregar el alojamiento');
      }
    } catch (error) {
      console.error('Error agregando alojamiento:', error);
      this.toastService.showError('Error', 'Error al guardar el alojamiento');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async actualizarAlojamiento(data: {id: number, alojamiento: Partial<Alojamiento>}) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.alojamientosService.actualizarAlojamiento(data.id, data.alojamiento);
      if (exito) {
        this.cerrarModalAlojamiento();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Alojamiento actualizado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo actualizar el alojamiento');
      }
    } catch (error) {
      console.error('Error actualizando alojamiento:', error);
      this.toastService.showError('Error', 'Error al actualizar el alojamiento');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarAlojamiento(alojamientoId: number) {
    this.alojamientoAEliminarId = alojamientoId;
    this.mostrarModalConfirmAlojamiento = true;
  }

  cerrarModalConfirmAlojamiento() {
    this.mostrarModalConfirmAlojamiento = false;
    this.alojamientoAEliminarId = undefined;
  }

  async confirmarEliminarAlojamiento() {
    if (this.alojamientoAEliminarId) {
      const idAEliminar = this.alojamientoAEliminarId;
      this.cerrarModalConfirmAlojamiento();
      try {
        this.cargando = true;
        this.cdr.detectChanges();
        const exito = await this.alojamientosService.eliminarAlojamiento(idAEliminar);
        if (exito) {
          if (this.viajeExpandidoId) {
            await this.cargarDatosViaje(this.viajeExpandidoId);
          }
          this.toastService.showSuccess('Éxito', 'Alojamiento eliminado correctamente');
        } else {
          this.toastService.showError('Error', 'No se pudo eliminar el alojamiento');
        }
      } catch (error) {
        console.error('Error eliminando alojamiento:', error);
        this.toastService.showError('Error', 'Error al eliminar el alojamiento');
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  // Métodos para actividades
  abrirModalActividad(viajeId: number) {
    this.viajeIdActual = viajeId;
    this.actividadEnEdicion = undefined;
    this.fechaInicioViajeActual = this.obtenerFechaInicioViaje(viajeId);
    this.mostrarModalActividad = true;
  }

  abrirModalEditarActividad(actividad: ActividadViaje) {
    this.viajeIdActual = actividad.viaje_id;
    this.actividadEnEdicion = actividad;
    this.fechaInicioViajeActual = this.obtenerFechaInicioViaje(actividad.viaje_id);
    this.mostrarModalActividad = true;
  }

  cerrarModalActividad() {
    this.mostrarModalActividad = false;
    this.viajeIdActual = undefined;
    this.actividadEnEdicion = undefined;
    this.fechaInicioViajeActual = undefined;
  }

  async agregarActividad(actividad: Omit<ActividadViaje, 'id' | 'created_at'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.actividadesViajeService.agregarActividad(actividad);
      if (exito) {
        this.cerrarModalActividad();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Actividad agregada correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo agregar la actividad');
      }
    } catch (error) {
      console.error('Error agregando actividad:', error);
      this.toastService.showError('Error', 'Error al guardar la actividad');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async actualizarActividad(data: {id: number, actividad: Partial<ActividadViaje>}) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.actividadesViajeService.actualizarActividad(data.id, data.actividad);
      if (exito) {
        this.cerrarModalActividad();
        if (this.viajeExpandidoId) {
          await this.cargarDatosViaje(this.viajeExpandidoId);
        }
        this.toastService.showSuccess('Éxito', 'Actividad actualizada correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo actualizar la actividad');
      }
    } catch (error) {
      console.error('Error actualizando actividad:', error);
      this.toastService.showError('Error', 'Error al actualizar la actividad');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarActividad(actividadId: number) {
    this.actividadAEliminarId = actividadId;
    this.mostrarModalConfirmActividad = true;
  }

  cerrarModalConfirmActividad() {
    this.mostrarModalConfirmActividad = false;
    this.actividadAEliminarId = undefined;
  }

  async confirmarEliminarActividad() {
    if (this.actividadAEliminarId) {
      const idAEliminar = this.actividadAEliminarId;
      this.cerrarModalConfirmActividad();
      try {
        this.cargando = true;
        this.cdr.detectChanges();
        const exito = await this.actividadesViajeService.eliminarActividad(idAEliminar);
        if (exito) {
          if (this.viajeExpandidoId) {
            await this.cargarDatosViaje(this.viajeExpandidoId);
          }
          this.toastService.showSuccess('Éxito', 'Actividad eliminada correctamente');
        } else {
          this.toastService.showError('Error', 'No se pudo eliminar la actividad');
        }
      } catch (error) {
        console.error('Error eliminando actividad:', error);
        this.toastService.showError('Error', 'Error al eliminar la actividad');
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  private obtenerFechaInicioViaje(viajeId: number): string | undefined {
    return this.viajes.find((viaje) => viaje.id === viajeId)?.fecha_desde;
  }

  async toggleActividadCompletada(actividad: ActividadViaje) {
    if (!actividad.id) return;
    try {
      await this.actividadesViajeService.actualizarActividad(actividad.id, {
        completada: !actividad.completada
      });
      if (this.viajeExpandidoId) {
        await this.cargarDatosViaje(this.viajeExpandidoId);
      }
    } catch (error) {
      console.error('Error actualizando actividad:', error);
    }
  }
}
