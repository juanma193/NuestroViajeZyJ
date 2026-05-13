import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import type { Material } from '../../../../core/models/material.model';
import type { MovimientoStock, TipoMovimientoStock } from '../../../../core/models/movimiento-stock.model';
import { StockEmprendimientoService } from '../../../../core/services/stock-emprendimiento.service';

@Component({
  selector: 'app-historial-stock-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-stock-modal.component.html',
})
export class HistorialStockModalComponent implements OnInit {
  @Input({ required: true }) material!: Material;
  @Output() cerrar = new EventEmitter<void>();

  cargando = false;
  movimientos: MovimientoStock[] = [];

  constructor(
    private stock: StockEmprendimientoService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  onCerrar() {
    this.cerrar.emit();
  }

  async cargar() {
    if (!this.material?.id) return;
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      this.movimientos = await this.stock.getMovimientosByMaterial(this.material.id);
    } catch (e) {
      console.error('Error cargando historial:', e);
      this.movimientos = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  formatFecha(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  badgeClass(tipo: TipoMovimientoStock): string {
    if (tipo === 'entrada' || tipo === 'compra' || tipo === 'devolucion') return 'bg-green-100 text-green-700';
    if (tipo === 'salida' || tipo === 'merma' || tipo === 'venta' || tipo === 'produccion') return 'bg-rose-100 text-rose-700';
    if (tipo === 'ajuste') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-700';
  }

  tipoLabel(tipo: TipoMovimientoStock): string {
    const map: Record<string, string> = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Ajuste',
      merma: 'Merma',
      devolucion: 'Devolución',
      compra: 'Compra',
      produccion: 'Producción',
      venta: 'Venta',
    };
    return map[tipo] ?? tipo;
  }
}
