import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Viaje } from '../../../core/models/viaje.model';

@Component({
  selector: 'app-modal-viaje',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-viaje.component.html',
})
export class ModalViajeComponent {
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Viaje, 'id' | 'created_at'>>();

  viaje: Omit<Viaje, 'id' | 'created_at'> = {
    nombre: '',
    descripcion: '',
    fecha_desde: '',
    fecha_hasta: '',
    estado: false
  };

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (!this.viaje.nombre.trim()) {
      alert('Por favor ingresa el nombre del viaje');
      return;
    }

    // Emitir guardar y cerrar inmediatamente para mejor UX
    this.guardar.emit({ ...this.viaje });
    this.cerrar.emit();
  }
}
