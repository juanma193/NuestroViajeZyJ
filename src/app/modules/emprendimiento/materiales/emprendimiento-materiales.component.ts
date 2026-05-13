import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/toast/services/toast.service';
import type { CategoriaMaterial } from '../../../core/models/categoria-material.model';
import type { Material, UnidadCantidad, UnidadBaseUso } from '../../../core/models/material.model';
import { CategoriasMaterialesService } from '../../../core/services/categorias-materiales.service';
import { MaterialesService } from '../../../core/services/materiales.service';
import { EmprendimientoCostosService } from '../../../core/services/emprendimiento-costos.service';
import { StockEmprendimientoService } from '../../../core/services/stock-emprendimiento.service';
import { NonNegativeNumberDirective } from '../../../core/directives/non-negative-number.directive';
import { getCantidadFaltante, getEstadoStock } from '../../../core/services/emprendimiento-stock.helpers';
import type { EstadoStock } from '../../../core/models/movimiento-stock.model';
import { AjustarStockModalComponent } from '../stock/ajustar-stock-modal/ajustar-stock-modal.component';
import { HistorialStockModalComponent } from '../stock/historial-stock-modal/historial-stock-modal.component';

@Component({
  selector: 'app-emprendimiento-materiales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NonNegativeNumberDirective,
    AjustarStockModalComponent,
    HistorialStockModalComponent,
  ],
  templateUrl: './emprendimiento-materiales.component.html',
})
export class EmprendimientoMaterialesComponent implements OnInit {
  categorias: CategoriaMaterial[] = [];
  materiales: Material[] = [];

  cargando = false;

  buscar = '';
  categoriaFiltro: number | 'todas' = 'todas';
  mostrarInactivos = true;

  estadoFiltro: 'todos' | EstadoStock = 'todos';
  soloBajoStock = false;

  materialAjuste: Material | null = null;
  materialHistorial: Material | null = null;

  mostrandoFormulario = false;
  editandoId?: number;

  form: {
    nombre: string;
    categoria_id: number | null;
    unidad_compra: UnidadCantidad;
    cantidad_compra: number | null;
    precio_compra: number | null;
    stock_actual: number | null;
    stock_minimo: number | null;
    proveedor: string;
    observaciones: string;
    activo: boolean;
  } = this.getFormInicial();

  unidadesCompra: UnidadCantidad[] = ['gr', 'kg', 'ml', 'cc', 'litro', 'unidad', 'metro'];

  constructor(
    private categoriasService: CategoriasMaterialesService,
    private materialesService: MaterialesService,
    private costos: EmprendimientoCostosService,
    private stock: StockEmprendimientoService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  get categoriasConTodas(): Array<{ id: number | 'todas'; nombre: string }> {
    return [
      { id: 'todas', nombre: 'Todas' },
      ...this.categorias.map((c) => ({ id: c.id!, nombre: c.nombre })),
    ];
  }

  get materialesFiltrados(): Material[] {
    const buscar = this.buscar.trim().toLowerCase();
    return (this.materiales ?? []).filter((m) => {
      if (!this.mostrarInactivos && !m.activo) return false;
      if (this.categoriaFiltro !== 'todas' && (m.categoria_id ?? null) !== this.categoriaFiltro)
        return false;
      if (buscar && !(m.nombre ?? '').toLowerCase().includes(buscar)) return false;

      const estado = this.estadoStock(m);
      if (this.estadoFiltro !== 'todos' && estado !== this.estadoFiltro) return false;
      if (this.soloBajoStock && !(estado === 'bajo' || estado === 'sin_stock')) return false;
      return true;
    });
  }

  get costoUnitarioPreview(): number | null {
    const cantidad = Number(this.form.cantidad_compra);
    const precio = Number(this.form.precio_compra);
    const res = this.costos.calcularCostoUnitarioMaterial({
      unidad_compra: this.form.unidad_compra,
      cantidad_compra: cantidad,
      precio_compra: precio,
    });
    return res ? res.costo_unitario : null;
  }

  get unidadBasePreview(): UnidadBaseUso | null {
    const cantidad = Number(this.form.cantidad_compra);
    const precio = Number(this.form.precio_compra);
    const res = this.costos.calcularCostoUnitarioMaterial({
      unidad_compra: this.form.unidad_compra,
      cantidad_compra: cantidad,
      precio_compra: precio,
    });
    return res ? res.unidad_base : null;
  }

  getFormInicial() {
    return {
      nombre: '',
      categoria_id: null,
      unidad_compra: 'gr' as UnidadCantidad,
      cantidad_compra: null,
      precio_compra: null,
      stock_actual: null,
      stock_minimo: 0,
      proveedor: '',
      observaciones: '',
      activo: true,
    };
  }

  async cargar() {
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const [cats, mats] = await Promise.all([
        this.categoriasService.listar(),
        this.materialesService.listar({ incluir_inactivos: true }),
      ]);
      this.categorias = cats;
      this.materiales = mats;
    } catch (e) {
      console.error('Error cargando materiales:', e);
      this.toast.showError('Error', 'No se pudieron cargar los materiales');
      this.categorias = [];
      this.materiales = [];
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  abrirNuevo() {
    this.editandoId = undefined;
    this.form = this.getFormInicial();
    this.mostrandoFormulario = true;
  }

  abrirEditar(material: Material) {
    this.editandoId = material.id;
    this.form = {
      nombre: material.nombre ?? '',
      categoria_id: (material.categoria_id ?? null) as any,
      unidad_compra: material.unidad_compra,
      cantidad_compra: material.cantidad_compra,
      precio_compra: material.precio_compra,
      stock_actual: material.stock_actual,
      stock_minimo: material.stock_minimo,
      proveedor: material.proveedor ?? '',
      observaciones: material.observaciones ?? '',
      activo: material.activo ?? true,
    };
    this.mostrandoFormulario = true;
  }

  cerrarFormulario() {
    this.mostrandoFormulario = false;
    this.editandoId = undefined;
    this.form = this.getFormInicial();
  }

  async guardar() {
    const nombre = (this.form.nombre ?? '').trim();
    if (!nombre) {
      this.toast.showWarning('Falta información', 'El nombre es obligatorio');
      return;
    }

    const cantidad_compra = Number(this.form.cantidad_compra);
    const precio_compra = Number(this.form.precio_compra);
    const stock_actual = Number(this.form.stock_actual);
    const stock_minimo = Number(this.form.stock_minimo);

    if (!Number.isFinite(precio_compra) || precio_compra < 0) {
      this.toast.showWarning('Revisar datos', 'El precio de compra debe ser ≥ 0');
      return;
    }

    if (!Number.isFinite(cantidad_compra) || cantidad_compra <= 0) {
      this.toast.showWarning('Revisar datos', 'La cantidad comprada debe ser > 0');
      return;
    }

    const costo = this.costos.calcularCostoUnitarioMaterial({
      unidad_compra: this.form.unidad_compra,
      cantidad_compra,
      precio_compra,
    });

    if (!costo) {
      this.toast.showWarning('Revisar datos', 'No se pudo calcular el costo unitario');
      return;
    }

    if (!Number.isFinite(stock_actual) || stock_actual < 0) {
      this.toast.showWarning('Revisar datos', 'El stock actual debe ser ≥ 0');
      return;
    }

    if (!Number.isFinite(stock_minimo) || stock_minimo < 0) {
      this.toast.showWarning('Revisar datos', 'El stock mínimo debe ser ≥ 0');
      return;
    }

    try {
      this.cargando = true;
      this.cdr.detectChanges();

      const payload = {
        nombre,
        categoria_id: this.form.categoria_id,
        unidad_compra: this.form.unidad_compra,
        cantidad_compra,
        precio_compra,
        // En Etapa 2 el stock se maneja por movimientos; acá se setea 0 y luego se registra ajuste/entrada.
        stock_actual: this.editandoId ? undefined : 0,
        stock_minimo,
        proveedor: this.form.proveedor.trim() ? this.form.proveedor.trim() : null,
        observaciones: this.form.observaciones.trim() ? this.form.observaciones.trim() : null,
        activo: this.form.activo,
      };

      let res: Material | null = null;
      if (this.editandoId) {
        // No enviamos stock_actual en edición (se ajusta desde movimientos).
        const { stock_actual: _ignored, ...sinStock } = payload as any;
        res = await this.materialesService.actualizar(this.editandoId, sinStock);
      } else {
        res = await this.materialesService.crear(payload as any);
        if (res && stock_actual > 0) {
          const stockOk = await this.stock.ajustarStockMaterial(res, stock_actual, 'Stock inicial');
          if (!stockOk) {
            this.toast.showError('Error', 'El material se creó, pero no se pudo registrar el stock inicial');
            await this.cargar();
            return;
          }
        }
      }

      if (!res) {
        this.toast.showError('Error', 'No se pudo guardar el material');
        return;
      }

      this.toast.showSuccess('Éxito', 'Material guardado');
      this.cerrarFormulario();
      await this.cargar();
    } catch (e) {
      console.error('Error guardando material:', e);
      this.toast.showError('Error', 'Error al guardar el material');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  async toggleActivo(material: Material) {
    if (!material.id) return;
    const nuevo = !(material.activo ?? true);
    try {
      this.cargando = true;
      this.cdr.detectChanges();
      const ok = await this.materialesService.setActivo(material.id, nuevo);
      if (!ok) {
        this.toast.showError('Error', 'No se pudo actualizar el material');
        return;
      }
      await this.cargar();
    } catch (e) {
      console.error('Error toggle activo material:', e);
      this.toast.showError('Error', 'Error actualizando el material');
    } finally {
      this.cargando = false;
      this.cdr.detectChanges();
    }
  }

  nombreCategoria(categoria_id?: number | null): string {
    if (!categoria_id) return 'Sin categoría';
    const c = this.categorias.find((x) => x.id === categoria_id);
    return c?.nombre ?? 'Sin categoría';
  }

  alertaStock(material: Material): boolean {
    const a = Number(material.stock_actual ?? 0);
    const m = Number(material.stock_minimo ?? 0);
    return Number.isFinite(a) && Number.isFinite(m) && a <= m;
  }

  estadoStock(material: Material): EstadoStock {
    return getEstadoStock(material);
  }

  textoEstado(material: Material): string {
    const estado = this.estadoStock(material);
    if (estado === 'disponible') return 'Disponible';
    if (estado === 'bajo') return 'Stock bajo';
    if (estado === 'sin_stock') return 'Sin stock';
    return 'Inactivo';
  }

  claseBadgeEstado(material: Material): string {
    const estado = this.estadoStock(material);
    if (estado === 'disponible') return 'bg-green-100 text-green-700';
    if (estado === 'bajo') return 'bg-amber-100 text-amber-800';
    if (estado === 'sin_stock') return 'bg-rose-100 text-rose-700';
    return 'bg-gray-100 text-gray-700';
  }

  claseBorde(material: Material): string {
    const estado = this.estadoStock(material);
    if (estado === 'sin_stock') return 'border-rose-200';
    if (estado === 'bajo') return 'border-amber-200';
    if (estado === 'inactivo') return 'border-gray-200';
    return 'border-pink-200';
  }

  faltanteMinimo(material: Material): number {
    return getCantidadFaltante(material);
  }

  abrirAjuste(material: Material) {
    this.materialAjuste = material;
  }

  abrirHistorial(material: Material) {
    this.materialHistorial = material;
  }

  cerrarModales() {
    this.materialAjuste = null;
    this.materialHistorial = null;
  }
}
