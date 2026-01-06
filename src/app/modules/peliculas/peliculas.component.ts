import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeliculasService } from '../../core/services/peliculas.service';
import { Pelicula } from '../../core/models/pelicula.model';
import { ModalPeliculaComponent } from './modal-pelicula/modal-pelicula.component';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-peliculas',
  standalone: true,
  imports: [CommonModule, ModalPeliculaComponent, ModalConfirmComponent],
  templateUrl: './peliculas.component.html',
})
export class PeliculasComponent implements OnInit {
  peliculas: Pelicula[] = [];
  cargando = true;
  mostrarModal = false;
  mostrarModalConfirm = false;
  peliculaAEliminarId?: number;
  peliculaAEliminarNombre = '';

  constructor(
    private peliculasService: PeliculasService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.cargarPeliculas();
  }

  async cargarPeliculas() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      console.log('Cargando películas...');
      this.peliculas = await this.peliculasService.obtenerPeliculas();
      console.log('Películas cargadas:', this.peliculas);
      this.cargando = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al cargar películas:', error);
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  get peliculasVistas() {
    return this.peliculas.filter(p => p.visto).length;
  }

  get peliculasPendientes() {
    return this.peliculas.filter(p => !p.visto).length;
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  async agregarPelicula(pelicula: Omit<Pelicula, 'id' | 'created_at'>) {
    try {
      console.log('Guardando película:', pelicula);
      this.cargando = true;
      this.cdr.detectChanges();
      const resultado = await this.peliculasService.agregarPelicula(pelicula);
      console.log('Resultado:', resultado);

      if (resultado) {
        console.log('Película guardada exitosamente');
        this.cerrarModal();
        await this.cargarPeliculas();
      } else {
        console.error('No se pudo guardar la película');
        alert('Error al guardar la película. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al guardar película:', error);
      alert('Error al guardar la película. Por favor, intenta de nuevo.');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleVisto(pelicula: Pelicula) {
    if (pelicula.id) {
      try {
        this.cargando = true;
        this.cdr.detectChanges();
        await this.peliculasService.actualizarPelicula(pelicula.id, { visto: !pelicula.visto });
        await this.cargarPeliculas();
      } catch (error) {
        console.error('Error actualizando visto:', error);
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  async eliminarPelicula(id: number | undefined) {
    // kept for backwards compatibility; open confirm modal instead
    this.abrirModalConfirm(id);
  }

  abrirModalConfirm(id?: number, nombre?: string) {
    this.peliculaAEliminarId = id;
    this.peliculaAEliminarNombre = nombre || '';
    this.mostrarModalConfirm = true;
  }

  cerrarModalConfirm() {
    this.mostrarModalConfirm = false;
    this.peliculaAEliminarId = undefined;
    this.peliculaAEliminarNombre = '';
  }

  async confirmarEliminar() {
    if (this.peliculaAEliminarId) {
      // Capturamos el id antes de cerrar el modal para evitar perder la referencia
      const idAEliminar = this.peliculaAEliminarId;
      // Cerramos el modal inmediatamente para mejor UX
      this.cerrarModalConfirm();

      try {
        this.cargando = true;
        this.cdr.detectChanges();
        const exito = await this.peliculasService.eliminarPelicula(idAEliminar);
        if (exito) {
          await this.cargarPeliculas();
        } else {
          alert('No se pudo eliminar la película.');
        }
      } catch (error) {
        console.error('Error eliminando película:', error);
        alert('Error eliminando la película.');
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    }
  }

  async setValoracion(pelicula: Pelicula, valoracion: number) {
    if (pelicula.id) {
      await this.peliculasService.actualizarPelicula(pelicula.id, {
        puntuacion: valoracion
      });
      await this.cargarPeliculas();
    }
  }

  getEstrellas(valoracion: number): string[] {
    return Array(5).fill('').map((_, i) => i < valoracion ? '★' : '☆');
  }
}
