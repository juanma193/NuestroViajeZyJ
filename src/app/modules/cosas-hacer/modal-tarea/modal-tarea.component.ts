import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tarea } from '../../../core/models/tarea.model';
import { CategoriaTarea } from '../../../core/models/categoria-tarea.model';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-modal-tarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-tarea.component.html',
})
export class ModalTareaComponent {
  @Input() categorias: CategoriaTarea[] = [];
  @Input() tareaEditar?: Tarea;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<Tarea, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>();

  tarea: Omit<Tarea, 'id' | 'fecha_creacion' | 'fecha_actualizacion'> = {
    titulo: '',
    descripcion: '',
    categoria_id: undefined,
    prioridad: 'media',
    completada: false,
    fecha_vencimiento: ''
  };

  constructor(private toastService: ToastService) {}

  ngOnChanges() {
    if (this.tareaEditar) {
      this.tarea = {
        titulo: this.tareaEditar.titulo,
        descripcion: this.tareaEditar.descripcion || '',
        categoria_id: this.tareaEditar.categoria_id,
        prioridad: this.tareaEditar.prioridad || 'media',
        completada: !!this.tareaEditar.completada,
        fecha_vencimiento: this.tareaEditar.fecha_vencimiento || ''
      };
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (!this.tarea.titulo || !this.tarea.titulo.trim()) {
      this.toastService.showWarning('Falta información', 'Ingresa el título de la tarea');
      return;
    }

    // Emitir guardar y cerrar inmediatamente para una mejor UX (optimista)
    this.guardar.emit({ ...this.tarea });
    this.cerrar.emit();
  }
}
