import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { Producto } from '../models/producto.model';

export interface ListarProductosParams {
  buscar?: string;
  incluir_inactivos?: boolean;
  pareja_id?: string;
}

export interface ProductoFotoUploadResult {
  path: string;
  publicUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private readonly table = 'productos';
  private readonly fotosBucket = 'productos-emprendimiento';

  constructor(
    private supabase: SupabaseService,
    private parejasService: ParejasService,
  ) {}

  private stripUnknownColumnFromPayload(
    payload: Record<string, any>,
    error: any,
  ): { payload: Record<string, any>; removed?: string } {
    const message = String(error?.message ?? '');
    const match = message.match(/Could not find the '([^']+)' column/);
    const column = match?.[1];
    if (!column) return { payload };

    if (!(column in payload)) return { payload };

    const next = { ...payload };
    delete next[column];
    return { payload: next, removed: column };
  }

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async listar(params: ListarProductosParams = {}): Promise<Producto[]> {
    try {
      const parejaId = await this.requireParejaId(params.pareja_id);
      let q = this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', parejaId)
        .order('nombre', { ascending: true });

      const buscar = (params.buscar ?? '').trim();
      if (buscar) {
        q = q.ilike('nombre', `%${buscar}%`);
      }

      if (!params.incluir_inactivos) {
        q = q.eq('activo', true);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error listando productos:', error);
        return [];
      }

      return (data as Producto[]) ?? [];
    } catch (e) {
      console.error('Error listando productos:', e);
      return [];
    }
  }

  async obtenerPorId(id: number, parejaId?: string): Promise<Producto | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error obteniendo producto:', e);
      return null;
    }
  }

  async getProductosActivos(parejaId?: string): Promise<Producto[]> {
    return this.listar({ incluir_inactivos: false, pareja_id: parejaId });
  }

  async getProductoById(id: number, parejaId?: string): Promise<Producto | null> {
    return this.obtenerPorId(id, parejaId);
  }

  async crear(payload: Omit<Producto, 'id' | 'pareja_id'>): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();
      const record: Producto = {
        ...payload,
        pareja_id: parejaId,
        margen_porcentaje: Math.max(0, payload.margen_porcentaje ?? 0),
      };

      const attempt = async (row: any) =>
        this.supabase.supabase.from(this.table).insert([row]).select('*').single();

      let { data, error } = await attempt(record);
      if (error?.code === 'PGRST204') {
        const stripped = this.stripUnknownColumnFromPayload(record as any, error);
        if (stripped.removed) {
          console.warn(
            `Columna inexistente en '${this.table}': '${stripped.removed}'. Reintentando insert sin ese campo.`,
          );
          ({ data, error } = await attempt(stripped.payload));
        }
      }

      if (error) {
        console.error('Error creando producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error creando producto:', e);
      return null;
    }
  }

  async actualizar(id: number, cambios: Partial<Producto>): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();

      const payload: any = { ...cambios };
      if (payload.margen_porcentaje != null) {
        payload.margen_porcentaje = Math.max(0, Number(payload.margen_porcentaje));
      }

      const attempt = async (pl: any) =>
        this.supabase.supabase
          .from(this.table)
          .update(pl)
          .eq('id', id)
          .eq('pareja_id', parejaId)
          .select('*')
          .single();

      let { data, error } = await attempt(payload);

      if (error?.code === 'PGRST204') {
        const stripped = this.stripUnknownColumnFromPayload(payload, error);
        if (stripped.removed) {
          console.warn(
            `Columna inexistente en '${this.table}': '${stripped.removed}'. Reintentando update sin ese campo.`,
          );
          ({ data, error } = await attempt(stripped.payload));
        }
      }

      if (error) {
        console.error('Error actualizando producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error actualizando producto:', e);
      return null;
    }
  }

  async setActivo(id: number, activo: boolean): Promise<boolean> {
    try {
      const parejaId = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .update({ activo })
        .eq('id', id)
        .eq('pareja_id', parejaId);

      if (error) {
        console.error('Error actualizando activo de producto:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error actualizando activo de producto:', e);
      return false;
    }
  }

  async actualizarCostos(
    id: number,
    costos: { costo_calculado: number; precio_sugerido: number },
  ): Promise<boolean> {
    try {
      const parejaId = await this.requireParejaId();
      const { error } = await this.supabase.supabase
        .from(this.table)
        .update({
          costo_calculado: costos.costo_calculado,
          precio_sugerido: costos.precio_sugerido,
        })
        .eq('id', id)
        .eq('pareja_id', parejaId);

      if (error) {
        console.error('Error guardando costos de producto:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error guardando costos de producto:', e);
      return false;
    }
  }

  async uploadProductoFoto(
    productoId: number,
    parejaId: string | undefined,
    file: File,
  ): Promise<ProductoFotoUploadResult | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const fileExt = this.getSafeFileExtension(file);
      if (!fileExt) {
        console.error('Extensión de imagen no permitida');
        return null;
      }

      const filePath = `${pid}/productos/${productoId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await this.supabase.supabase.storage
        .from(this.fotosBucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Error subiendo foto de producto:', uploadError);
        return null;
      }

      const { data } = this.supabase.supabase.storage
        .from(this.fotosBucket)
        .getPublicUrl(filePath);

      return {
        path: filePath,
        publicUrl: data.publicUrl,
      };
    } catch (e) {
      console.error('Error subiendo foto de producto:', e);
      return null;
    }
  }

  async deleteProductoFoto(path: string | null | undefined): Promise<boolean> {
    if (!path) return true;
    try {
      const { error } = await this.supabase.supabase.storage
        .from(this.fotosBucket)
        .remove([path]);

      if (error) {
        console.error('Error eliminando foto de producto:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('Error eliminando foto de producto:', e);
      return false;
    }
  }

  getProductoFotoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const { data } = this.supabase.supabase.storage.from(this.fotosBucket).getPublicUrl(path);
    return data.publicUrl ?? null;
  }

  async updateProductoFoto(
    productoId: number,
    fotoPath: string | null,
    fotoUrl: string | null,
  ): Promise<Producto | null> {
    try {
      const parejaId = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update({
          foto_path: fotoPath,
          foto_url: fotoUrl,
        })
        .eq('id', productoId)
        .eq('pareja_id', parejaId)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando foto de producto:', error);
        return null;
      }

      return (data as Producto) ?? null;
    } catch (e) {
      console.error('Error actualizando foto de producto:', e);
      return null;
    }
  }

  private getSafeFileExtension(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!ext || !allowed.includes(ext)) return null;
    return ext;
  }
}
