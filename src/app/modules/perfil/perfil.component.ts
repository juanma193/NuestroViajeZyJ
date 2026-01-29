import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfilesService, Profile } from '../../core/services/profiles.service';
import { ParejasService, ParejaMiembroInfo } from '../../core/services/parejas.service';
import type { User } from '@supabase/supabase-js';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  catchError,
} from 'rxjs';

interface PerfilVm {
  loading: boolean;
  error?: string | null;
  email: string;
  perfil: Profile;
  parejaCode: string;
  parejaMiembros: ParejaMiembroInfo[];
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent {
  guardando = false;
  subiendoAvatar = false;
  isEditing = false;
  email = '';
  perfil: Profile = { id: '' };
  avatarError = false;
  avatarDisplayUrl = '';
  parejaCode = '';
  parejaMiembros: ParejaMiembroInfo[] = [];
  private fallbackNombre = '';
  private fallbackAvatar = '';
  private perfilSnapshot: Profile | null = null;
  private lastAvatarUrl = '';
  private perfilInicializado = false;
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly user$: Observable<User>;
  readonly vm$: Observable<PerfilVm>;

  constructor(
    private authService: AuthService,
    private profilesService: ProfilesService,
    private parejasService: ParejasService,
  ) {
    this.user$ = this.authService.user$.pipe(
      filter((user): user is User => !!user),
      distinctUntilChanged((a, b) => a.id === b.id),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.vm$ = combineLatest([this.user$, this.refresh$]).pipe(
      switchMap(([user]) =>
        this.parejasService.getProfileBundle$(user.id).pipe(
          switchMap((bundle) =>
            from(this.sincronizarEstado(user, bundle.profile ?? null, bundle.pareja ?? null)).pipe(
              map(() => ({ user, bundle }))
            )
          ),
          map(({ user, bundle }) => ({
            loading: false,
            error: null,
            email: user.email ?? '',
            perfil: this.perfil,
            parejaCode: bundle.pareja?.inviteCode ?? '',
            parejaMiembros: bundle.pareja?.miembros ?? [],
          } as PerfilVm)),
          catchError((error) => of({
            loading: false,
            error: error?.message ?? 'No se pudo cargar el perfil',
            email: this.email,
            perfil: this.perfil,
            parejaCode: this.parejaCode,
            parejaMiembros: this.parejaMiembros,
          } as PerfilVm))
        )
      ),
      startWith({
        loading: true,
        error: null,
        email: this.email,
        perfil: this.perfil,
        parejaCode: this.parejaCode,
        parejaMiembros: this.parejaMiembros,
      } as PerfilVm),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private async sincronizarEstado(
    user: User,
    perfil: Profile | null,
    pareja: { inviteCode: string | null; miembros: ParejaMiembroInfo[] } | null
  ) {
    this.email = user.email ?? '';
    if (!this.perfil.id) {
      this.perfil = { id: user.id };
    }

    this.fallbackNombre = (user.user_metadata?.['full_name'] as string) ?? '';
    this.fallbackAvatar = (user.user_metadata?.['avatar_url'] as string) ?? '';

    const perfilBase: Profile = perfil ?? {
      id: user.id,
      nombre: this.fallbackNombre || null,
      avatar_url: this.fallbackAvatar || null,
    };

    if (!perfilBase.nombre) {
      perfilBase.nombre = this.fallbackNombre;
    }

    if (!perfilBase.avatar_url) {
      perfilBase.avatar_url = this.fallbackAvatar;
    }

    if (!this.perfilInicializado || !this.isEditing) {
      this.perfil = { ...perfilBase };
      this.perfilInicializado = true;
    }

    this.parejaCode = pareja?.inviteCode ?? '';
    this.parejaMiembros = pareja?.miembros ?? [];

    if (this.perfil.avatar_url) {
      await this.actualizarAvatarDisplay();
    } else {
      this.avatarDisplayUrl = '';
    }

    this.avatarError = false;
  }

  async guardarPerfil() {
    if (!this.perfil.id) return;
    this.guardando = true;
    const guardado = await this.profilesService.upsertPerfil(this.perfil);
    this.guardando = false;
    if (!guardado) {
      console.error('No se pudo guardar el perfil');
      return;
    }

    this.perfil = guardado;
    if (this.perfil.avatar_url) {
      await this.actualizarAvatarDisplay();
    }
    this.isEditing = false;
    this.perfilSnapshot = null;
    this.parejasService.invalidateProfileCache(this.perfil.id);
    this.refresh$.next();
  }

  async subirAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || !this.perfil.id) return;

    this.subiendoAvatar = true;
    const url = await this.profilesService.subirAvatar(this.perfil.id, archivo);
    this.subiendoAvatar = false;

    if (!url) return;

    this.perfil.avatar_url = url;
    this.avatarError = false;
    await this.actualizarAvatarDisplay();
    await this.guardarPerfil();
  }

  onAvatarError() {
    this.avatarError = true;
  }

  iniciarEdicion() {
    this.perfilSnapshot = { ...this.perfil };
    this.isEditing = true;
  }

  cancelarEdicion() {
    if (this.perfilSnapshot) {
      this.perfil = { ...this.perfilSnapshot };
      if (this.perfil.avatar_url) {
        this.actualizarAvatarDisplay();
      } else {
        this.avatarDisplayUrl = '';
      }
    }
    this.isEditing = false;
    this.perfilSnapshot = null;
  }

  private async actualizarAvatarDisplay() {
    const avatarUrl = this.perfil.avatar_url ?? '';
    if (!avatarUrl) {
      this.avatarDisplayUrl = '';
      this.lastAvatarUrl = '';
      return;
    }

    if (avatarUrl === this.lastAvatarUrl && this.avatarDisplayUrl) {
      return;
    }

    this.lastAvatarUrl = avatarUrl;

    const url = await this.profilesService.obtenerAvatarUrl(avatarUrl);
    const separator = url.includes('?') ? '&' : '?';
    this.avatarDisplayUrl = `${url}${separator}t=${Date.now()}`;
    this.avatarError = false;
  }

  invalidateCache() {
    if (this.perfil.id) {
      this.parejasService.invalidateProfileCache(this.perfil.id);
    }
    this.refresh$.next();
  }
}
