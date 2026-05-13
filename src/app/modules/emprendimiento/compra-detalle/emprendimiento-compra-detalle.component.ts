import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import type { CompraDetalleEmprendimiento } from '../../../core/models/compra-detalle-emprendimiento.model';
import type { CompraEmprendimiento } from '../../../core/models/compra-emprendimiento.model';
import type { Material, UnidadCantidad } from '../../../core/models/material.model';
import type { MovimientoStock } from '../../../core/models/movimiento-stock.model';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';
import { ComprasEmprendimientoService } from '../../../core/services/compras-emprendimiento.service';
import { convertirAUnidadBase } from '../../../core/services/emprendimiento-stock.helpers';
import { MaterialesService } from '../../../core/services/materiales.service';
import { StockEmprendimientoService } from '../../../core/services/stock-emprendimiento.service';
import { ToastService } from '../../../core/toast/services/toast.service';

@Component({
  selector: 'app-emprendimiento-compra-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NonNegativeNumberDirective],
  templateUrl: './emprendimiento-compra-detalle.component.html',
})
export class EmprendimientoCompraDetalleComponent implements OnInit {
  compraId?: number;
  compra: CompraEmprendimiento | null = null;
  detalles: CompraDetalleEmprendimiento[] = [];
  movimientos: MovimientoStock[] = [];
  materiales: Material[] = [];

  cargando = false;
  mostrandoDetalleForm = false;

  form = this.getDetalleFormInicial();

  constructor(
    private route: ActivatedRoute,
    private comprasService: ComprasEmprendimientoService,
    private materialesService: MaterialesService,
    private stockService: StockEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(id)) {
      this.toast.showError('Error', 'Compra inválida');
      return;
    }
    this.compraId = id;
    await this.cargar();
  }

  get materialesActivos(): Material[] {
    return (this.materiales ?? []).filter((m) => m.activo ?? true);
  }

  get movimientoPorDetalle(): Map<number, MovimientoStock> {
    const map = new Map<number, MovimientoStock>();
    for (const movimiento of this.movimientos ?? []) {
      if (movimiento.compra_detalle_id) {
        map.set(movimiento.compra_detalle_id, movimiento);
      }
    }
    return map;
  }

  get materialSeleccionado(): Material | null {
    if (!this.form.material_id) return null;
    return this.materiales.find((m) => m.id === this.form.material_id) ?? null;
  }

  get cantidadConvertidaPreview(): number | null {
    const material = this.materialSeleccionado;
    const cantidad = Number(this.form.cantidad);
    if (!material || !Number.isFinite(cantidad) || cantidad <= 0) return null;
    return convertirAUnidadBase(cantidad, this.form.unidad, material.unidad_base);
  }

  get costoUnitarioPreview(): number | null {
    const cantidadBase = this.cantidadConvertidaPreview;
    const precioTotal = Number(this.form.precio_total);
    if (!cantidadBase || cantidadBase <= 0 || !Number.isFinite(precioTotal) || precioTotal < 0) {
      return null;
    }
    return precioTotal / cantidadBase;
  }

  getDetalleFormInicial() {
    return {
      material_id: null as number | null,
      cantidad: null as number | null,
      unidad: 'gr' as UnidadCantidad,
      precio_total: null as number | null,
      observaciones: '',
    };
  }

  async cargar() {
    if (!this.compraId) return;

    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [{ compra, detalles }, materiales, movimientos] = await Promise.all([
        this.comprasService.getCompraConDetalles(this.compraId),
        this.materialesService.listar({ incluir_inactivos: true }),
        this.stockService.getMovimientosByCompra(this.compraId),
      ]);
      this.compra = compra;
      this.detalles = detalles;
      this.materiales = materiales;
      this.movimientos = movimientos;
    } catch (e) {
      console.error('Error cargando detalle de compra:', e);
      this.toast.showError('Error', 'No se pudo cargar la compra');
      this.compra = null;
      this.detalles = [];
      this.movimientos = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirAgregarDetalle() {
    this.form = this.getDetalleFormInicial();
    this.mostrandoDetalleForm = true;
  }

  cerrarAgregarDetalle() {
    this.form = this.getDetalleFormInicial();
    this.mostrandoDetalleForm = false;
  }

  onMaterialChange() {
    const material = this.materialSeleccionado;
    this.form.unidad = material?.unidad_base ?? 'gr';
  }

  unidadesPara(material: Material | null): UnidadCantidad[] {
    if (!material) return ['gr', 'kg', 'ml', 'cc', 'litro', 'unidad', 'metro'];
    const base = material.unidad_base;
    if (base === 'gr' || base === 'kg') return ['gr', 'kg'];
    if (base === 'ml' || base === 'cc' || base === 'litro') return ['ml', 'cc', 'litro'];
    if (base === 'metro' || base === 'cm') return ['metro', 'cm'];
    return ['unidad'];
  }

  async agregarDetalle() {
    if (!this.compraId || !this.compra) return;
    if (!(this.compra.activo ?? true)) {
      this.toast.showWarning('Compra inactiva', 'No se pueden agregar materiales a una compra inactiva');
      return;
    }

    const material = this.materialSeleccionado;
    if (!material || !material.id) {
      this.toast.showWarning('Falta información', 'Seleccioná un material');
      return;
    }

    const cantidad = Number(this.form.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.toast.showWarning('Revisar datos', 'Completá la cantidad');
      return;
    }

    const precioTotal = Number(this.form.precio_total ?? 0);
    if (!Number.isFinite(precioTotal) || precioTotal < 0) {
      this.toast.showWarning('Revisar datos', 'El precio total debe ser mayor o igual a 0');
      return;
    }

    const cantidadBase = convertirAUnidadBase(cantidad, this.form.unidad, material.unidad_base);
    if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
      this.toast.showWarning('Revisar datos', 'La unidad no se pudo convertir al stock base');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const detalle = await this.comprasService.createDetalleCompra({
        compra_id: this.compraId,
        material,
        cantidad,
        unidad: this.form.unidad,
        precio_total: precioTotal,
        observaciones: this.form.observaciones.trim() || null,
      });

      if (!detalle) {
        this.toast.showError('Error', 'No se pudo agregar el material a la compra');
        return;
      }

      this.toast.showSuccess('Éxito', 'Material agregado a la compra');
      this.cerrarAgregarDetalle();
      await this.cargar();
    } catch (e) {
      console.error('Error agregando detalle de compra:', e);
      this.toast.showError('Error', 'No se pudo agregar el material a la compra');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  movimientoParaDetalle(detalle: CompraDetalleEmprendimiento): MovimientoStock | null {
    if (!detalle.id) return null;
    return this.movimientoPorDetalle.get(detalle.id) ?? null;
  }

  formatFecha(value: string | null | undefined, incluirHora = false): string {
    if (!value) return '-';
    if (!incluirHora && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yyyy, mm, dd] = value.split('-');
      return `${dd}/${mm}/${yyyy}`;
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (!incluirHora) return `${dd}/${mm}/${yyyy}`;
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }
}
