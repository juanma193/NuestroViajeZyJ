import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TareasService } from '../../core/services/tareas.service';
import { Tarea } from '../../core/models/tarea.model';
import { CategoriaTarea } from '../../core/models/categoria-tarea.model';
import { ModalTareaComponent } from './modal-tarea/modal-tarea.component';
import { ModalConfirmComponent } from '../peliculas/modal-confirm/modal-confirm.component';
import { ToastService } from '../../core/toast/services/toast.service';

@Component({
  selector: 'app-cosas-hacer',
  standalone: true,
  imports: [CommonModule, ModalTareaComponent, ModalConfirmComponent],
  templateUrl: './cosas-hacer.component.html',
})
export class CosasHacerComponent implements OnInit {
  tareas: Tarea[] = [];
  categorias: CategoriaTarea[] = [];
  categoriaSeleccionada: number | 'Todas' = 'Todas';
  cargando = true;

  mostrarModal = false;
  tareaEditar?: Tarea;

  mostrarModalConfirm = false;
  tareaAEliminarId?: number;

  constructor(private tareasService: TareasService, private cdr: ChangeDetectorRef, private toastService: ToastService) {}

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [tareas, categorias] = await Promise.all([
        this.tareasService.obtenerTareas(),
        this.tareasService.obtenerCategorias()
      ]);

      this.tareas = tareas;
      // build categories list with 'Todas' option
      this.categorias = [{ id: 0, nombre: 'Todas', slug: 'todas', orden: 0 }, ...categorias];
    } catch (error) {
      console.error('Error cargando tareas o categorías:', error);
      this.tareas = [];
      this.categorias = [{ id: 0, nombre: 'Todas', slug: 'todas', orden: 0 }];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  getCategoriaNombre(categoria_id?: number) {
    if (!categoria_id) return 'Sin categoría';
    const c = this.categorias.find((x: any) => typeof x === 'object' && x.id === categoria_id) as CategoriaTarea | undefined;
    return c ? c.nombre : 'Sin categoría';
  }

  get tareasFiltradas() {
    if (this.categoriaSeleccionada === 'Todas') return this.tareas;
    const cid = typeof this.categoriaSeleccionada === 'number' ? this.categoriaSeleccionada : undefined;
    if (!cid) return this.tareas;
    return this.tareas.filter(t => t.categoria_id === cid);
  }

  get categoriasSinTodas() {
    return this.categorias.filter(c => c.id !== 0);
  }

  get tareasCompletadas() {
    return this.tareas.filter(t => t.completada).length;
  }

  get tareasPendientes() {
    return this.tareas.filter(t => !t.completada).length;
  }

  abrirModal(tarea?: Tarea) {
    this.tareaEditar = tarea;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.tareaEditar = undefined;
    this.mostrarModal = false;
  }

  async agregarTarea(tarea: Omit<Tarea, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const res = await this.tareasService.agregarTarea(tarea);
      if (res) {
        this.cerrarModal();
        await this.cargarDatos();
        this.toastService.showSuccess('Éxito', 'Tarea guardada correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo guardar la tarea');
      }
    } catch (error) {
      console.error('Error agregando tarea:', error);
      this.toastService.showError('Error', 'Error al guardar la tarea');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleCompletada(tarea: Tarea) {
    if (!tarea.id) return;
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      await this.tareasService.actualizarTarea(tarea.id, { completada: !tarea.completada });
      await this.cargarDatos();
    } catch (error) {
      console.error('Error actualizando completada:', error);
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalConfirm(id?: number) {
    this.tareaAEliminarId = id;
    this.mostrarModalConfirm = true;
  }

  cerrarModalConfirm() {
    this.tareaAEliminarId = undefined;
    this.mostrarModalConfirm = false;
  }

  async confirmarEliminar() {
    if (!this.tareaAEliminarId) return;
    const id = this.tareaAEliminarId;
    this.cerrarModalConfirm();
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.tareasService.eliminarTarea(id);
      if (exito) {
        await this.cargarDatos();
        this.toastService.showSuccess('Éxito', 'Tarea eliminada correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo eliminar la tarea');
      }
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      this.toastService.showError('Error', 'Error eliminando tarea');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  cambiarCategoria(categoria: CategoriaTarea) {
    if (!categoria || categoria.id === 0) this.categoriaSeleccionada = 'Todas';
    else this.categoriaSeleccionada = categoria.id || 'Todas';
  }
}
