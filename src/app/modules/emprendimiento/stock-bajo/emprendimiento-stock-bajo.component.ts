import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Material } from '../../../core/models/material.model';
import type { EstadoStock } from '../../../core/models/movimiento-stock.model';
import type { CategoriaMaterial } from '../../../core/models/categoria-material.model';
import { MaterialesService } from '../../../core/services/materiales.service';
import { CategoriasMaterialesService } from '../../../core/services/categorias-materiales.service';
import { ToastService } from '../../../core/toast/services/toast.service';
import { getCantidadFaltante, getEstadoStock } from '../../../core/services/emprendimiento-stock.helpers';
import { AjustarStockModalComponent } from '../stock/ajustar-stock-modal/ajustar-stock-modal.component';
import { HistorialStockModalComponent } from '../stock/historial-stock-modal/historial-stock-modal.component';

@Component({
  selector: 'app-emprendimiento-stock-bajo',
  standalone: true,
  imports: [CommonModule, FormsModule, AjustarStockModalComponent, HistorialStockModalComponent],
  templateUrl: './emprendimiento-stock-bajo.component.html',
})
export class EmprendimientoStockBajoComponent implements OnInit {
  cargando = false;
  incluirInactivos = false;

  materiales: Material[] = [];
  categorias: CategoriaMaterial[] = [];

  materialAjuste: Material | null = null;
  materialHistorial: Material | null = null;

  constructor(
    private materialesService: MaterialesService,
    private categoriasService: CategoriasMaterialesService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [materiales, categorias] = await Promise.all([
        this.materialesService.listar({ incluir_inactivos: true }),
        this.categoriasService.listar(),
      ]);
      this.materiales = materiales;
      this.categorias = categorias;
    } catch (e) {
      console.error('Error cargando bajo stock:', e);
      this.toast.showError('Error', 'No se pudieron cargar los materiales');
      this.materiales = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  estadoStock(m: Material): EstadoStock {
    return getEstadoStock(m);
  }

  faltanteMinimo(m: Material): number {
    return getCantidadFaltante(m);
  }

  nombreCategoria(categoria_id?: number | null): string {
    if (!categoria_id) return 'Sin categoría';
    return this.categorias.find((c) => c.id === categoria_id)?.nombre ?? 'Sin categoría';
  }

  nombreProveedor(m: Material): string {
    return m.proveedor_rel?.nombre || m.proveedor || 'Sin proveedor';
  }

  get materialesBajoStock(): Material[] {
    const list = (this.materiales ?? []).filter((m) => {
      if (!this.incluirInactivos && !(m.activo ?? true)) return false;
      if (!(m.activo ?? true) && !this.incluirInactivos) return false;

      const stock = Number(m.stock_actual ?? 0);
      const minimo = Number(m.stock_minimo ?? 0);
      return Number.isFinite(stock) && Number.isFinite(minimo) && stock <= minimo;
    });

    // Orden: sin stock primero, luego bajo stock
    return list.sort((a, b) => {
      const ea = this.estadoStock(a);
      const eb = this.estadoStock(b);
      const rank = (e: EstadoStock) => (e === 'sin_stock' ? 0 : e === 'bajo' ? 1 : 2);
      const ra = rank(ea);
      const rb = rank(eb);
      if (ra !== rb) return ra - rb;
      return Number(a.stock_actual ?? 0) - Number(b.stock_actual ?? 0);
    });
  }

  textoEstado(m: Material): string {
    const e = this.estadoStock(m);
    if (e === 'sin_stock') return 'Sin stock';
    if (e === 'bajo') return 'Stock bajo';
    if (e === 'disponible') return 'Disponible';
    return 'Inactivo';
  }

  claseBadgeEstado(m: Material): string {
    const e = this.estadoStock(m);
    if (e === 'disponible') return 'bg-green-100 text-green-700';
    if (e === 'bajo') return 'bg-amber-100 text-amber-800';
    if (e === 'sin_stock') return 'bg-rose-100 text-rose-700';
    return 'bg-gray-100 text-gray-700';
  }

  claseBorde(m: Material): string {
    const e = this.estadoStock(m);
    if (e === 'sin_stock') return 'border-rose-200';
    if (e === 'bajo') return 'border-amber-200';
    if (e === 'inactivo') return 'border-gray-200';
    return 'border-pink-200';
  }

  abrirAjuste(m: Material) {
    this.materialAjuste = m;
  }

  abrirHistorial(m: Material) {
    this.materialHistorial = m;
  }

  cerrarModales() {
    this.materialAjuste = null;
    this.materialHistorial = null;
  }
}
