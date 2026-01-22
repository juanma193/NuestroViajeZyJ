import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Alojamiento } from '../../../core/models/alojamiento.model';

@Component({
  selector: 'app-modal-alojamiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-alojamiento.component.html',
})
export class ModalAlojamientoComponent {
  @Input() viajeId!: number;
  @Input() alojamiento?: Alojamiento;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Alojamiento, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{id: number, alojamiento: Partial<Alojamiento>}>();

  formulario: Omit<Alojamiento, 'id' | 'created_at'> = {
    viaje_id: 0,
    nombre: '',
    tipo: 'Hotel',
    direccion: '',
    fecha_checkin: '',
    fecha_checkout: '',
    precio_noche: undefined,
    notas: '',
  };

  tiposAlojamiento = ['Hotel', 'Airbnb', 'Hostel', 'Casa Rural', 'Apartamento', 'Otro'];

  ngOnInit() {
    this.formulario.viaje_id = this.viajeId;
    if (this.alojamiento) {
      this.formulario = { ...this.alojamiento };
    }
  }

  onGuardar() {
    if (this.formulario.nombre && this.formulario.fecha_checkin && this.formulario.fecha_checkout) {
      if (this.alojamiento?.id) {
        // Modo edición
        this.actualizar.emit({ id: this.alojamiento.id, alojamiento: { ...this.formulario } });
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
