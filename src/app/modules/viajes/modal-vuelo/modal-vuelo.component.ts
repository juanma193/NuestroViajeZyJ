import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Vuelo } from '../../../core/models/vuelo.model';

@Component({
  selector: 'app-modal-vuelo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-vuelo.component.html',
})
export class ModalVueloComponent {
  @Input() viajeId!: number;
  @Input() vuelo?: Vuelo;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Vuelo, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{id: number, vuelo: Partial<Vuelo>}>();

  formulario: Omit<Vuelo, 'id' | 'created_at'> = {
    viaje_id: 0,
    origen: '',
    destino: '',
    aerolinea: '',
    numero_vuelo: '',
    fecha_salida: '',
    hora_salida: '',
    fecha_llegada: '',
    hora_llegada: '',
    precio: undefined,
    notas: '',
  };

  ngOnInit() {
    this.formulario.viaje_id = this.viajeId;
    if (this.vuelo) {
      this.formulario = { ...this.vuelo };
    }
  }

  onGuardar() {
    if (this.formulario.origen && this.formulario.destino) {
      if (this.vuelo?.id) {
        // Modo edición
        this.actualizar.emit({ id: this.vuelo.id, vuelo: { ...this.formulario } });
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
