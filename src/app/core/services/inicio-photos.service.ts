import { Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';
import { AuthService } from './auth.service';

export interface InicioPhotoRecord {
  id: number | string;
  pareja_id: string;
  path: string;
  created_by?: string | null;
  created_at?: string;
  orden?: number | null;
}

type CacheItem = { url: string; exp?: number };

@Injectable({
  providedIn: 'root',
})
export class InicioPhotosService {
  private readonly tableName = 'fotos_inicio';
  private readonly bucketName = 'fotos-inicio';

  /**
   * Si tu bucket es público, dejalo en true (más rápido).
   * Si es privado, ponelo en false para usar signed urls + cache con expiración.
   */
  private readonly usePublicBucket = true;

  /** Expiración de signed URLs (solo si bucket privado) */
  private readonly signedUrlSeconds = 60 * 30; // 30 min

  /** Cache en memoria */
  private readonly memCache = new Map<string, CacheItem>();

  /** Cache en localStorage (para evitar recargar cada vez que volvés al inicio) */
  private readonly lsPrefix = 'nv_inicio_urlcache_v1:';
  private readonly lsSoftTtlMs = 1000 * 60 * 25; // 25 min (ligeramente menor que 30m)

  constructor(private supabase: SupabaseService, private authService: AuthService) {}

  // --------------------------------------------
  // DB
  // --------------------------------------------
  async listPhotos(parejaId: string): Promise<InicioPhotoRecord[]> {
    const { data, error } = await this.supabase.supabase
      .from(this.tableName)
      .select('id, pareja_id, path, created_by, created_at, orden')
      .eq('pareja_id', parejaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[InicioPhotosService] listPhotos error:', error);
      return [];
    }

    return (data ?? []) as InicioPhotoRecord[];
  }

  // --------------------------------------------
  // Upload
  // --------------------------------------------
  async uploadPhoto(parejaId: string, file: File): Promise<{ path: string | null; error?: string }> {
    const userId = this.authService.currentUser?.id ?? (await this.authService.getUser())?.id ?? null;
    if (!userId) return { path: null, error: 'No se pudo identificar al usuario.' };

    const extension = this.getFileExtension(file) ?? 'jpg';
    const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `${parejaId}/${timestamp}-${random}.${safeExt}`;

    const { error: uploadError } = await this.supabase.supabase.storage.from(this.bucketName).upload(path, file, {
      // Cache largo (mejora performance al volver a ver la imagen)
      cacheControl: '31536000', // 1 año
      contentType: file.type || `image/${safeExt}`,
      upsert: false,
    });

    if (uploadError) {
      console.error('[InicioPhotosService] upload error:', uploadError);
      return { path: null, error: uploadError.message };
    }

    const { error: insertError } = await this.supabase.supabase.from(this.tableName).insert({
      pareja_id: parejaId,
      path,
      created_by: userId,
    });

    if (insertError) {
      console.error('[InicioPhotosService] insert record error:', insertError);
      // Si falló DB pero el archivo subió, lo ideal sería borrarlo para no dejar basura:
      // await this.supabase.supabase.storage.from(this.bucketName).remove([path]);
      return { path: null, error: insertError.message };
    }

    // Invalida cache para ese path (por las dudas)
    this.evictCache(parejaId, path);

    return { path };
  }

  // --------------------------------------------
  // URLs (rápido + cache)
  // --------------------------------------------

  /**
   * Devuelve URL lista para usar (cache mem + localStorage).
   * Si bucket público -> getPublicUrl (instantáneo).
   * Si bucket privado -> createSignedUrl (con expiración).
   */
  async getDisplayUrl(parejaId: string, path: string): Promise<string> {
    if (!path) return '';

    const cached = this.getCached(parejaId, path);
    if (cached) return cached;

    // PUBLIC bucket: ultra rápido, sin requests extra más allá del cálculo local
    if (this.usePublicBucket) {
      const { data } = this.supabase.supabase.storage.from(this.bucketName).getPublicUrl(path);
      const url = data?.publicUrl ?? '';
      if (url) this.setCached(parejaId, path, { url }); // sin exp
      return url;
    }

    // PRIVATE bucket: signed url (request)
    const { data, error } = await this.supabase.supabase.storage.from(this.bucketName).createSignedUrl(path, this.signedUrlSeconds);
    if (!error && data?.signedUrl) {
      const exp = Date.now() + this.lsSoftTtlMs;
      this.setCached(parejaId, path, { url: data.signedUrl, exp });
      return data.signedUrl;
    }

    // Fallback (por si te quedó público igual)
    const { data: fallback } = this.supabase.supabase.storage.from(this.bucketName).getPublicUrl(path);
    const fallbackUrl = fallback?.publicUrl ?? '';
    if (fallbackUrl) this.setCached(parejaId, path, { url: fallbackUrl });
    return fallbackUrl;
  }

  /**
   * Mantengo la firma original pero ahora pide parejaId para cache correcto.
   * Si preferís no tocar llamadas existentes, podés dejar un overload o wrapper.
   */
  async getDisplayUrls(parejaId: string, paths: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const unique = Array.from(new Set(paths.filter(Boolean)));

    // 1) llenar desde cache
    const toFetch: string[] = [];
    for (const p of unique) {
      const cached = this.getCached(parejaId, p);
      if (cached) result.set(p, cached);
      else toFetch.push(p);
    }

    if (!toFetch.length) return result;

    // 2) público: getPublicUrl es local, pero igual iteramos
    if (this.usePublicBucket) {
      for (const p of toFetch) {
        const { data } = this.supabase.supabase.storage.from(this.bucketName).getPublicUrl(p);
        const url = data?.publicUrl ?? '';
        if (url) {
          this.setCached(parejaId, p, { url });
          result.set(p, url);
        }
      }
      return result;
    }

    // 3) privado: firmar en batch (pero NO bloquees UI en el componente: mejor progressive)
    // Aún así lo dejo por compatibilidad.
    const { data, error } = await this.supabase.supabase.storage.from(this.bucketName).createSignedUrls(toFetch, this.signedUrlSeconds);
    if (!error && data?.length) {
      const exp = Date.now() + this.lsSoftTtlMs;
      for (const item of data) {
        if (!item?.path || !item?.signedUrl) continue;
        this.setCached(parejaId, item.path, { url: item.signedUrl, exp });
        result.set(item.path, item.signedUrl);
      }
    }

    return result;
  }

  /**
   * ⭐ Nuevo: carga progresiva con concurrencia limitada.
   * Ideal para que el INICIO no se "congele" esperando todos los URLs.
   */
  async hydrateUrlsProgressive(
    parejaId: string,
    photos: Array<{ path: string }>,
    onResolved: (path: string, url: string) => void,
    concurrency = 4
  ): Promise<void> {
    const paths = photos.map((p) => p.path).filter(Boolean);
    if (!paths.length) return;

    // Primero: resolver cache inmediato (aparece al instante)
    const remaining: string[] = [];
    for (const p of paths) {
      const cached = this.getCached(parejaId, p);
      if (cached) onResolved(p, cached);
      else remaining.push(p);
    }

    if (!remaining.length) return;

    // Luego: resolver los que faltan con concurrencia limitada
    await this.runWithConcurrency(remaining, concurrency, async (p) => {
      const url = await this.getDisplayUrl(parejaId, p);
      if (url) onResolved(p, url);
    });
  }

  // --------------------------------------------
  // Delete
  // --------------------------------------------
  async deletePhoto(parejaId: string, id: number | string, path: string): Promise<boolean> {
    const { error: deleteError } = await this.supabase.supabase.from(this.tableName).delete().eq('id', id);

    if (deleteError) {
      console.error('[InicioPhotosService] delete record error:', deleteError);
      return false;
    }

    const { error: storageError } = await this.supabase.supabase.storage.from(this.bucketName).remove([path]);
    if (storageError) {
      console.error('[InicioPhotosService] delete storage error:', storageError);
      return false;
    }

    this.evictCache(parejaId, path);
    return true;
  }

  // --------------------------------------------
  // Helpers: cache (mem + localStorage)
  // --------------------------------------------
  private cacheKey(parejaId: string, path: string) {
    return `${this.lsPrefix}${parejaId}:${path}`;
  }

  private getCached(parejaId: string, path: string): string | null {
    const key = this.cacheKey(parejaId, path);

    // Mem cache
    const mem = this.memCache.get(key);
    if (mem) {
      if (!mem.exp || mem.exp > Date.now()) return mem.url;
      this.memCache.delete(key);
    }

    // LS cache
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const item = JSON.parse(raw) as CacheItem;
      if (!item?.url) return null;
      if (item.exp && item.exp <= Date.now()) return null;

      // repoblar mem
      this.memCache.set(key, item);
      return item.url;
    } catch {
      return null;
    }
  }

  private setCached(parejaId: string, path: string, item: CacheItem) {
    const key = this.cacheKey(parejaId, path);
    this.memCache.set(key, item);

    // LS: solo si tiene exp o si es público (sin exp) igual sirve
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch {
      // ignorar errores de quota
    }
  }

  private evictCache(parejaId: string, path: string) {
    const key = this.cacheKey(parejaId, path);
    this.memCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  // --------------------------------------------
  // Helpers: concurrency
  // --------------------------------------------
  private async runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    const queue = [...items];
    const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        await worker(item);
      }
    });
    await Promise.all(runners);
  }

  // --------------------------------------------
  // File helpers
  // --------------------------------------------
  private getFileExtension(file: File): string | null {
    const fromName = file.name.split('.').pop();
    if (fromName) return fromName.toLowerCase();

    if (file.type) {
      const [, ext] = file.type.split('/');
      return ext?.toLowerCase() ?? null;
    }

    return null;
  }
}
