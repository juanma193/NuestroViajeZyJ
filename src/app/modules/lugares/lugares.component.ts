import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LugaresVisitarService } from '../../core/services/lugares-visitar.service';
import { LugarPorVisitar } from '../../core/models/lugar-por-visitar.model';
import { ModalLugarComponent } from './modal-lugar/modal-lugar.component';
import { ModalConfirmComponent } from '../peliculas/modal-confirm/modal-confirm.component';
import { ToastService } from '../../core/toast/services/toast.service';

type FiltroEstado = 'Todos' | 'Por Visitar' | 'Visitados';

@Component({
  selector: 'app-lugares',
  standalone: true,
  imports: [CommonModule, ModalLugarComponent, ModalConfirmComponent],
  templateUrl: './lugares.component.html',
})
export class LugaresComponent implements OnInit {
  lugares: LugarPorVisitar[] = [];
  categoriaSeleccionada = 'Todas';
  estadoSeleccionado: FiltroEstado = 'Todos';
  cargando = true;

  mostrarModal = false;
  lugarEditar?: LugarPorVisitar;

  mostrarModalConfirm = false;
  lugarAEliminarId?: number;

  constructor(
    private lugaresService: LugaresVisitarService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    await this.cargarLugares();
  }

  async cargarLugares() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.lugares = await this.lugaresService.getLugares();
    } catch (error) {
      console.error('Error cargando lugares:', error);
      this.lugares = [];
      this.toastService.showError('Error', 'No se pudieron cargar los lugares');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  get categoriasUnicas(): string[] {
    const categorias = new Set(this.lugares.map(l => l.categoria));
    return ['Todas', ...Array.from(categorias).sort()];
  }

  get lugaresFiltrados(): LugarPorVisitar[] {
    let filtrados = this.lugares;

    // Filtrar por categoría
    if (this.categoriaSeleccionada !== 'Todas') {
      filtrados = filtrados.filter(l => l.categoria === this.categoriaSeleccionada);
    }

    // Filtrar por estado
    if (this.estadoSeleccionado === 'Por Visitar') {
      filtrados = filtrados.filter(l => !l.visitado);
    } else if (this.estadoSeleccionado === 'Visitados') {
      filtrados = filtrados.filter(l => l.visitado);
    }

    // Ordenar: primero los no visitados, luego los visitados
    return filtrados.sort((a, b) => {
      if (a.visitado === b.visitado) return 0;
      return a.visitado ? 1 : -1;
    });
  }

  get lugaresVisitados(): number {
    return this.lugares.filter(l => l.visitado).length;
  }

  get lugaresPendientes(): number {
    return this.lugares.filter(l => !l.visitado).length;
  }

  abrirModal(lugar?: LugarPorVisitar) {
    this.lugarEditar = lugar;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.lugarEditar = undefined;
    this.mostrarModal = false;
  }

  async guardarLugar(lugar: Omit<LugarPorVisitar, 'id' | 'created_at' | 'updated_at'>) {
    try {
      this.cargando = true;
      this.cdr.detectChanges();

      let res;
      if (this.lugarEditar?.id) {
        // Editar lugar existente
        res = await this.lugaresService.updateLugar(this.lugarEditar.id, lugar);
      } else {
        // Crear nuevo lugar
        res = await this.lugaresService.createLugar(lugar);
      }

      if (res) {
        this.cerrarModal();
        await this.cargarLugares();
        this.toastService.showSuccess('Éxito', 'Lugar guardado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo guardar el lugar');
      }
    } catch (error) {
      console.error('Error guardando lugar:', error);
      this.toastService.showError('Error', 'Error al guardar el lugar');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleVisitado(lugar: LugarPorVisitar) {
    if (!lugar.id) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      await this.lugaresService.updateLugar(lugar.id, { visitado: !lugar.visitado });
      await this.cargarLugares();
      this.toastService.showSuccess(
        'Éxito', 
        lugar.visitado ? 'Marcado como no visitado' : 'Marcado como visitado'
      );
    } catch (error) {
      console.error('Error actualizando estado:', error);
      this.toastService.showError('Error', 'No se pudo actualizar el estado');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalConfirm(id?: number) {
    this.lugarAEliminarId = id;
    this.mostrarModalConfirm = true;
  }

  cerrarModalConfirm() {
    this.lugarAEliminarId = undefined;
    this.mostrarModalConfirm = false;
  }

  async confirmarEliminar() {
    if (!this.lugarAEliminarId) return;

    const id = this.lugarAEliminarId;
    this.cerrarModalConfirm();

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const exito = await this.lugaresService.deleteLugar(id);
      
      if (exito) {
        await this.cargarLugares();
        this.toastService.showSuccess('Éxito', 'Lugar eliminado correctamente');
      } else {
        this.toastService.showError('Error', 'No se pudo eliminar el lugar');
      }
    } catch (error) {
      console.error('Error eliminando lugar:', error);
      this.toastService.showError('Error', 'Error eliminando el lugar');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  cambiarCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
  }

  cambiarEstado(estado: FiltroEstado) {
    this.estadoSeleccionado = estado;
  }

  getCategoriaEmoji(categoria: string): string {
    const emojis: { [key: string]: string } = {
      'Playa': '🏖️',
      'Montaña': '⛰️',
      'Ciudad': '🏙️',
      'Monumento': '🗿',
      'Templo': '⛩️',
      'Isla': '🏝️',
      'Naturaleza': '🌿',
      'Museo': '🏛️',
      'Parque': '🌳',
      'Otro': '📍'
    };
    return emojis[categoria] || '📍';
  }
}
