import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Viaje } from '../../../core/models/viaje.model';

@Component({
  selector: 'app-modal-viaje',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-viaje.component.html',
})
export class ModalViajeComponent implements OnInit {
  @Input() viajeEditar?: Viaje;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Viaje, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{id: number, viaje: Partial<Viaje>}>();

  viaje: Omit<Viaje, 'id' | 'created_at'> = {
    nombre: '',
    descripcion: '',
    fecha_desde: '',
    fecha_hasta: '',
    estado: false
  };

  ngOnInit() {
    if (this.viajeEditar) {
      this.viaje = {
        nombre: this.viajeEditar.nombre,
        descripcion: this.viajeEditar.descripcion || '',
        fecha_desde: this.viajeEditar.fecha_desde || '',
        fecha_hasta: this.viajeEditar.fecha_hasta || '',
        estado: this.viajeEditar.estado || false
      };
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (!this.viaje.nombre.trim()) {
      alert('Por favor ingresa el nombre del viaje');
      return;
    }

    if (this.viajeEditar?.id) {
      // Modo edición
      this.actualizar.emit({ id: this.viajeEditar.id, viaje: { ...this.viaje } });
    } else {
      // Modo creación
      this.guardar.emit({ ...this.viaje });
    }
    this.cerrar.emit();
  }
}
