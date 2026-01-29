import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';

export interface ParejaMiembroInfo {
  user_id: string;
  nombre?: string | null;
  rol?: string | null;
}

export interface ParejaInfo {
  parejaId: string;
  inviteCode: string | null;
  miembros: ParejaMiembroInfo[];
}

@Injectable({
  providedIn: 'root',
})
export class ParejasService {
  private cachedParejaId: string | null = null;
  private parejaIdPromise?: Promise<string | null>;
  private pairDetailsCache?: ParejaInfo | null;
  private pairDetailsPromise?: Promise<ParejaInfo | null>;

  constructor(private supabase: SupabaseService) {}

  async getParejaIdActual(): Promise<string | null> {
    return this.getMyPair();
  }

  async getMyPair(): Promise<string | null> {
    if (this.cachedParejaId) {
      return this.cachedParejaId;
    }

    if (this.parejaIdPromise) {
      return this.parejaIdPromise;
    }
    this.parejaIdPromise = (async () => {
      const { data: userData, error: userError } = await this.supabase.supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error('Error obteniendo usuario para pareja:', userError);
        return null;
      }

      const { data, error } = await this.supabase.supabase
        .from('pareja_miembros')
        .select('pareja_id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo pareja_id:', error);
        return null;
      }

      this.cachedParejaId = data?.pareja_id ?? null;
      return this.cachedParejaId;
    })();

    try {
      return await this.parejaIdPromise;
    } finally {
      this.parejaIdPromise = undefined;
    }
  }

  async createPair(nombre?: string): Promise<string | null> {
    const { data: userData, error: userError } = await this.supabase.supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('Error obteniendo usuario para crear pareja:', userError);
      return null;
    }

    const inviteCode = this.generarInviteCode();
    const { data: pareja, error: parejaError } = await this.supabase.supabase
      .from('parejas')
      .insert({ nombre: nombre ?? null, created_by: userData.user.id, invite_code: inviteCode })
      .select('id')
      .single();

    if (parejaError || !pareja?.id) {
      console.error('Error creando pareja:', parejaError);
      return null;
    }

    const { error: miembroError } = await this.supabase.supabase
      .from('pareja_miembros')
      .insert({ pareja_id: pareja.id, user_id: userData.user.id, rol: 'owner' });

    if (miembroError) {
      console.error('Error creando miembro de pareja:', miembroError);
      return null;
    }

    this.cachedParejaId = pareja.id;
    return pareja.id;
  }

  async joinByCode(code: string): Promise<string | null> {
    const { data, error } = await this.supabase.supabase
      .rpc('join_pareja_by_code', { code });

    if (error) {
      console.error('Error uniendo a pareja por código:', error);
      return null;
    }

    this.cachedParejaId = data ?? null;
    return this.cachedParejaId;
  }

  setParejaId(parejaId: string | null) {
    this.cachedParejaId = parejaId;
    this.pairDetailsCache = undefined;
  }

  async getPairDetails(): Promise<ParejaInfo | null> {
    if (this.pairDetailsCache) {
      return this.pairDetailsCache;
    }

    if (this.pairDetailsPromise) {
      return this.pairDetailsPromise;
    }

    this.pairDetailsPromise = this.getPairDetailsInternal();
    try {
      this.pairDetailsCache = await this.pairDetailsPromise;
      return this.pairDetailsCache;
    } finally {
      this.pairDetailsPromise = undefined;
    }
  }

  private async getPairDetailsInternal(): Promise<ParejaInfo | null> {
    const parejaId = await this.getMyPair();
    if (!parejaId) return null;

    const { data: parejaData, error: parejaError } = await this.supabase.supabase
      .from('parejas')
      .select('id, invite_code')
      .eq('id', parejaId)
      .single();

    if (parejaError) {
      console.error('Error obteniendo pareja:', parejaError);
      return null;
    }

    const { data: miembrosData, error: miembrosError } = await this.supabase.supabase
      .from('pareja_miembros')
      .select('user_id, rol')
      .eq('pareja_id', parejaId);

    if (miembrosError) {
      console.error('Error obteniendo miembros:', miembrosError);
      return {
        parejaId,
        inviteCode: parejaData?.invite_code ?? null,
        miembros: [],
      };
    }

    const userIds = (miembrosData ?? []).map((m) => m.user_id).filter(Boolean);
    let profilesMap = new Map<string, { nombre?: string | null }>();

    if (userIds.length) {
      const { data: profilesData, error: profilesError } = await this.supabase.supabase
        .from('profiles')
        .select('id, nombre')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error obteniendo perfiles:', profilesError);
      } else if (profilesData) {
        profilesMap = new Map(profilesData.map((p) => [p.id, { nombre: p.nombre }])) as Map<string, { nombre?: string | null }>;
      }
    }

    const miembros = (miembrosData ?? []).map((m) => ({
      user_id: m.user_id,
      rol: m.rol,
      nombre: profilesMap.get(m.user_id)?.nombre ?? null,
    }));

    return {
      parejaId,
      inviteCode: parejaData?.invite_code ?? null,
      miembros,
    };
  }

  limpiarCache() {
    this.cachedParejaId = null;
    this.pairDetailsCache = undefined;
    this.parejaIdPromise = undefined;
    this.pairDetailsPromise = undefined;
  }

  private generarInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
