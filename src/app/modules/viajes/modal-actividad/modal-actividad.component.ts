import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActividadViaje } from '../../../core/models/actividad-viaje.model';

@Component({
  selector: 'app-modal-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-actividad.component.html',
})
export class ModalActividadComponent {
  @Input() viajeId!: number;
  @Input() actividad?: ActividadViaje;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<ActividadViaje, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{id: number, actividad: Partial<ActividadViaje>}>();

  formulario: Omit<ActividadViaje, 'id' | 'created_at'> = {
    viaje_id: 0,
    nombre: '',
    descripcion: '',
    fecha: '',
    hora: '',
    ubicacion: '',
    precio: undefined,
    completada: false,
    prioridad: 'Media',
  };

  prioridades = ['Alta', 'Media', 'Baja'];

  ngOnInit() {
    this.formulario.viaje_id = this.viajeId;
    if (this.actividad) {
      this.formulario = { ...this.actividad };
    }
  }

  onGuardar() {
    if (this.formulario.nombre) {
      if (this.actividad?.id) {
        // Modo edición
        this.actualizar.emit({ id: this.actividad.id, actividad: { ...this.formulario } });
      } else {
        // Modo creación
        this.guardar.emit(this.formulario);
      }
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }
}
