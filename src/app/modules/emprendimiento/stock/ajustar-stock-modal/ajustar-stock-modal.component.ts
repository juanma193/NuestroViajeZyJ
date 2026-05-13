import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Material } from '../../../../core/models/material.model';
import type { TipoMovimientoStock } from '../../../../core/models/movimiento-stock.model';
import { ToastService } from '../../../../core/toast/services/toast.service';
import { StockEmprendimientoService } from '../../../../core/services/stock-emprendimiento.service';
import { NonNegativeNumberDirective } from '../../../../core/directives/non-negative-number.directive';

@Component({
  selector: 'app-ajustar-stock-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NonNegativeNumberDirective],
  templateUrl: './ajustar-stock-modal.component.html',
})
export class AjustarStockModalComponent {
  @Input({ required: true }) material!: Material;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();

  guardando = false;

  tipoMovimiento: TipoMovimientoStock = 'entrada';
  cantidad: number | null = null;
  motivo = '';
  observaciones = '';

  tipos: Array<{ value: TipoMovimientoStock; label: string }> = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'salida', label: 'Salida' },
    { value: 'ajuste', label: 'Ajuste' },
    { value: 'merma', label: 'Merma' },
    { value: 'devolucion', label: 'Devolución' },
  ];

  constructor(private stock: StockEmprendimientoService, private toast: ToastService) {}

  onCerrar() {
    if (this.guardando) return;
    this.cerrar.emit();
  }

  get stockActual(): number {
    return Number(this.material?.stock_actual ?? 0);
  }

  get labelCantidad(): string {
    return this.tipoMovimiento === 'ajuste' ? 'Nuevo stock final' : 'Cantidad';
  }

  get stockNuevoPreview(): number {
    const c = Number(this.cantidad ?? 0);
    if (!Number.isFinite(c)) return this.stockActual;

    if (this.tipoMovimiento === 'ajuste') {
      return Math.max(c, 0);
    }

    const actual = this.stockActual;
    if (this.tipoMovimiento === 'entrada' || this.tipoMovimiento === 'devolucion') return actual + c;
    if (this.tipoMovimiento === 'salida' || this.tipoMovimiento === 'merma') return actual - c;

    // compra/produccion/venta no se hacen desde este modal.
    return actual;
  }

  async onGuardar() {
    if (!this.material?.id) return;

    const c = Number(this.cantidad);
    if (!Number.isFinite(c) || c <= 0) {
      this.toast.showWarning('Revisar datos', 'La cantidad debe ser > 0');
      return;
    }

    const motivo = (this.motivo ?? '').trim();
    if (!motivo) {
      this.toast.showWarning('Falta información', 'El motivo es obligatorio');
      return;
    }

    // Pre-validación de stock insuficiente (la RPC igual valida)
    if ((this.tipoMovimiento === 'salida' || this.tipoMovimiento === 'merma') && this.stockNuevoPreview < 0) {
      this.toast.showError('Stock insuficiente', 'No puedes dejar el stock negativo');
      return;
    }

    try {
      this.guardando = true;

      const res = await this.stock.registrarMovimientoStockDetailed({
        material_id: this.material.id,
        tipo: this.tipoMovimiento,
        cantidad: this.tipoMovimiento === 'ajuste' ? Math.max(c, 0) : c,
        unidad: this.material.unidad_base,
        motivo,
        observaciones: this.observaciones.trim() ? this.observaciones.trim() : null,
        compra_id: null,
        compra_detalle_id: null,
        producto_id: null,
        venta_id: null,
      });

      if (!res.ok) {
        const msg = (res.error ?? '').toLowerCase().includes('stock') ? 'Stock insuficiente' : 'No se pudo actualizar el stock';
        this.toast.showError('Error', msg);
        return;
      }

      this.toast.showSuccess('Éxito', 'Stock actualizado correctamente');
      this.actualizado.emit();
      this.cerrar.emit();
    } catch (e) {
      console.error('Error ajustando stock:', e);
      this.toast.showError('Error', 'No se pudo actualizar el stock');
    } finally {
      this.guardando = false;
    }
  }
}
