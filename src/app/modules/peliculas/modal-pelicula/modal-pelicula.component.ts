import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pelicula } from '../../../core/models/pelicula.model';

@Component({
  selector: 'app-modal-pelicula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-pelicula.component.html',
  styleUrl: './modal-pelicula.component.css'
})
export class ModalPeliculaComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Pelicula, 'id' | 'created_at'>>();

  pelicula = {
    nombre: '',
    fecha_estreno: new Date().getFullYear().toString(),
    puntuacion: 0,
    comentario: '',
    visto: false
  };

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (this.pelicula.nombre.trim()) {
      console.log('Emitiendo película:', this.pelicula);
      this.guardar.emit({...this.pelicula});
    } else {
      alert('Por favor, ingresa el nombre de la película');
    }
  }

  setValoracion(valoracion: number) {
    this.pelicula.puntuacion = valoracion;
  }

  getEstrellas(): string[] {
    return Array(5).fill('').map((_, i) => i < this.pelicula.puntuacion ? '★' : '☆');
  }
}
