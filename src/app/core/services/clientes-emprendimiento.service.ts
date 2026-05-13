import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { ParejasService } from './parejas.service';
import type { ClienteEmprendimiento } from '../models/cliente-emprendimiento.model';

@Injectable({
  providedIn: 'root',
})
export class ClientesEmprendimientoService {
  private readonly table = 'clientes_emprendimiento';

  constructor(private supabase: SupabaseService, private parejasService: ParejasService) {}

  private async requireParejaId(parejaId?: string): Promise<string> {
    const id = parejaId ?? (await this.parejasService.getParejaIdActual());
    if (!id) throw new Error('No se encontró una pareja activa.');
    return id;
  }

  async getClientes(parejaId?: string): Promise<ClienteEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', pid)
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error listando clientes:', error);
        return [];
      }

      return (data as ClienteEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error listando clientes:', e);
      return [];
    }
  }

  async getClienteById(id: number, parejaId?: string): Promise<ClienteEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .eq('pareja_id', pid)
        .single();

      if (error) {
        console.error('Error obteniendo cliente:', error);
        return null;
      }

      return (data as ClienteEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error obteniendo cliente:', e);
      return null;
    }
  }

  async createCliente(
    payload: Omit<ClienteEmprendimiento, 'id' | 'created_at' | 'updated_at' | 'pareja_id'>,
  ): Promise<ClienteEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const record: ClienteEmprendimiento = {
        ...payload,
        pareja_id: pid,
        activo: payload.activo ?? true,
      };

      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .insert([record])
        .select('*')
        .single();

      if (error) {
        console.error('Error creando cliente:', error);
        return null;
      }

      return (data as ClienteEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error creando cliente:', e);
      return null;
    }
  }

  async updateCliente(
    id: number,
    payload: Partial<ClienteEmprendimiento>,
  ): Promise<ClienteEmprendimiento | null> {
    try {
      const pid = await this.requireParejaId();
      const { data, error } = await this.supabase.supabase
        .from(this.table)
        .update({ ...payload })
        .eq('id', id)
        .eq('pareja_id', pid)
        .select('*')
        .single();

      if (error) {
        console.error('Error actualizando cliente:', error);
        return null;
      }

      return (data as ClienteEmprendimiento) ?? null;
    } catch (e) {
      console.error('Error actualizando cliente:', e);
      return null;
    }
  }

  async toggleClienteActivo(id: number, activo: boolean): Promise<boolean> {
    const actualizado = await this.updateCliente(id, { activo });
    return !!actualizado;
  }

  async searchClientes(parejaId: string | undefined, term: string): Promise<ClienteEmprendimiento[]> {
    try {
      const pid = await this.requireParejaId(parejaId);
      const buscar = term.trim();
      let q = this.supabase.supabase
        .from(this.table)
        .select('*')
        .eq('pareja_id', pid)
        .order('nombre', { ascending: true });

      if (buscar) {
        q = q.or(
          `nombre.ilike.%${buscar}%,telefono.ilike.%${buscar}%,instagram.ilike.%${buscar}%`,
        );
      }

      const { data, error } = await q;
      if (error) {
        console.error('Error buscando clientes:', error);
        return [];
      }

      return (data as ClienteEmprendimiento[]) ?? [];
    } catch (e) {
      console.error('Error buscando clientes:', e);
      return [];
    }
  }
}
