import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CosaParaLlevar } from '../../../core/models/cosa-para-llevar.model';

@Component({
  selector: 'app-modal-cosa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-cosa-llevar.component.html',
})
export class ModalCosaLlevarComponent {
  @Input() viajeId!: number;
  @Input() cosa?: CosaParaLlevar;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<CosaParaLlevar, 'id' | 'created_at'>>();
  @Output() actualizar = new EventEmitter<{ id: number; cosa: Partial<CosaParaLlevar> }>();

  mostrarErrores = false;

  formulario: Omit<CosaParaLlevar, 'id' | 'created_at'> = {
    viaje_id: 0,
    nombre: '',
    completado: false,
  };

  ngOnInit() {
    this.formulario.viaje_id = this.viajeId;
    if (this.cosa) {
      this.formulario = { ...this.cosa };
    }
  }

  onGuardar() {
    this.mostrarErrores = true;

    const nombreValido = !!this.formulario.nombre?.trim();
    if (!nombreValido) {
      return;
    }

    if (this.cosa?.id) {
      this.actualizar.emit({ id: this.cosa.id, cosa: { ...this.formulario } });
    } else {
      this.guardar.emit(this.formulario);
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }
}
