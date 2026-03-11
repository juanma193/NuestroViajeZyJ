import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LugarPorVisitar } from '../../../core/models/lugar-por-visitar.model';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-modal-lugar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-lugar.component.html',
})
export class ModalLugarComponent implements OnChanges {
  @Input() lugarEditar?: LugarPorVisitar;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<Omit<LugarPorVisitar, 'id' | 'created_at' | 'updated_at'>>();

  lugar: Omit<LugarPorVisitar, 'id' | 'created_at' | 'updated_at'> = {
    nombre: '',
    ubicacion: '',
    descripcion: '',
    categoria: '',
    visitado: false
  };

  categoriasSugeridas = [
    'Playa',
    'Montaña',
    'Ciudad',
    'Monumento',
    'Templo',
    'Isla',
    'Naturaleza',
    'Museo',
    'Parque',
    'Otro'
  ];

  constructor(private toastService: ToastService) {}

  ngOnChanges() {
    if (this.lugarEditar) {
      this.lugar = {
        nombre: this.lugarEditar.nombre,
        ubicacion: this.lugarEditar.ubicacion,
        descripcion: this.lugarEditar.descripcion || '',
        categoria: this.lugarEditar.categoria,
        visitado: !!this.lugarEditar.visitado
      };
    }
  }

  onCerrar() {
    this.cerrar.emit();
  }

  onGuardar() {
    if (!this.lugar.nombre?.trim()) {
      this.toastService.showWarning('Falta información', 'Ingresa el nombre del lugar');
      return;
    }

    if (!this.lugar.ubicacion?.trim()) {
      this.toastService.showWarning('Falta información', 'Ingresa la ubicación del lugar');
      return;
    }

    if (!this.lugar.categoria?.trim()) {
      this.toastService.showWarning('Falta información', 'Selecciona o ingresa una categoría');
      return;
    }

    this.guardar.emit({ ...this.lugar });
  }

  seleccionarCategoria(categoria: string) {
    this.lugar.categoria = categoria;
  }
}
