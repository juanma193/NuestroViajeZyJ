import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfilesService, Profile } from '../../core/services/profiles.service';
import { ParejasService, ParejaMiembroInfo } from '../../core/services/parejas.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
})
export class PerfilComponent implements OnInit, OnDestroy {
  cargando = true;
  guardando = false;
  subiendoAvatar = false;
  isEditing = false;
  email = '';
  perfil: Profile = { id: '' };
  avatarError = false;
  avatarDisplayUrl = '';
  cargandoPareja = false;
  parejaCode = '';
  parejaMiembros: ParejaMiembroInfo[] = [];
  private authSub?: Subscription;
  private perfilCargado = false;
  private parejaCargada = false;
  private fallbackNombre = '';
  private fallbackAvatar = '';
  private perfilSnapshot: Profile | null = null;

  constructor(
    private authService: AuthService,
    private profilesService: ProfilesService,
    private parejasService: ParejasService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.cargando = true;
    this.authSub = this.authService.user$.subscribe(async (user) => {
      try {
        if (!user) {
          return;
        }

        this.email = user.email ?? '';
        if (!this.perfil.id) {
          this.perfil = { id: user.id };
        }

        this.fallbackNombre = (user.user_metadata?.['full_name'] as string) ?? '';
        this.fallbackAvatar = (user.user_metadata?.['avatar_url'] as string) ?? '';
        if (!this.perfilCargado) {
          this.perfilCargado = true;
          await this.cargarPerfil(user.id);
        }

        if (!this.parejaCargada) {
          this.parejaCargada = true;
          await this.cargarParejaInfo();
        }
        
        if (!this.perfil.nombre) {
          this.perfil.nombre = this.fallbackNombre;
        }
        
        if (!this.perfil.avatar_url) {
          this.perfil.avatar_url = this.fallbackAvatar;
        }
        
        if (this.perfil.avatar_url) {
          await this.actualizarAvatarDisplay();
        }
        this.avatarError = false;
      } catch (error) {
        console.error('Error cargando perfil:', error);
      } finally {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  private async cargarPerfil(userId: string) {
    const existente = await this.profilesService.obtenerPerfil(userId);
    if (existente) {
      this.perfil = existente;
      if (this.perfil.avatar_url) {
        await this.actualizarAvatarDisplay();
      }
      return;
    }

    const basePerfil: Profile = {
      id: userId,
      nombre: this.fallbackNombre || null,
      avatar_url: this.fallbackAvatar || null,
    };

    const guardado = await this.profilesService.upsertPerfil(basePerfil);
    if (!guardado) return;

    this.perfil = guardado;
    if (this.perfil.avatar_url) {
      await this.actualizarAvatarDisplay();
    }
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
    if (!this.perfil.avatar_url) {
      this.avatarDisplayUrl = '';
      return;
    }

    const url = await this.profilesService.obtenerAvatarUrl(this.perfil.avatar_url);
    const separator = url.includes('?') ? '&' : '?';
    this.avatarDisplayUrl = `${url}${separator}t=${Date.now()}`;
    this.avatarError = false;
  }

  private async cargarParejaInfo() {
    this.cargandoPareja = true;
    const info = await this.parejasService.getPairDetails();
    this.cargandoPareja = false;

    if (!info) {
      this.parejaCode = '';
      this.parejaMiembros = [];
      return;
    }

    this.parejaCode = info.inviteCode ?? '';
    this.parejaMiembros = info.miembros;
  }
}
