import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pelicula } from '../../../core/models/pelicula.model';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-modal-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-pelicula.component.html',
})
export class ModalPeliculaComponent implements OnInit {
  @Input() peliculaEditar?: Pelicula;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Pelicula, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{id: number, pelicula: Partial<Pelicula>}>();

  pelicula = {
    nombre: '',
    fecha_estreno: new Date().getFullYear().toString(),
    puntuacion: 0,
    comentario: '',
    visto: false
  };

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    if (this.peliculaEditar) {
      this.pelicula = {
        nombre: this.peliculaEditar.nombre,
        fecha_estreno: this.peliculaEditar.fecha_estreno || new Date().getFullYear().toString(),
        puntuacion: this.peliculaEditar.puntuacion || 0,
        comentario: this.peliculaEditar.comentario || '',
        visto: this.peliculaEditar.visto || false
      };
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (this.pelicula.nombre.trim()) {
      console.log('Emitiendo película:', this.pelicula);
      if (this.peliculaEditar?.id) {
        // Modo edición
        this.actualizar.emit({ id: this.peliculaEditar.id, pelicula: { ...this.pelicula } });
      } else {
        // Modo creación
        this.guardar.emit({...this.pelicula});
      }
      this.cerrar.emit();
    } else {
      this.toastService.showWarning('Falta información', 'Por favor, ingresa el nombre de la película');
    }
  }

  setValoracion(valoracion: number) {
    this.pelicula.puntuacion = valoracion;
  }

  getEstrellas(): string[] {
    return Array(5).fill('').map((_, i) => i < this.pelicula.puntuacion ? '★' : '☆');
  }
}
