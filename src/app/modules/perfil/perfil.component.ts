import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfilesService, Profile } from '../../core/services/profiles.service';
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
  email = '';
  perfil: Profile = { id: '' };
  private authSub?: Subscription;
  private perfilCargado = false;

  constructor(private authService: AuthService, private profilesService: ProfilesService) {}

  async ngOnInit() {
    this.cargando = true;
    this.authSub = this.authService.user$.subscribe(async (user) => {
      if (!user) {
        this.cargando = false;
        return;
      }

      this.email = user.email ?? '';
      this.perfil = {
        id: user.id,
        nombre: (user.user_metadata?.['full_name'] as string) ?? '',
        avatar_url: (user.user_metadata?.['avatar_url'] as string) ?? '',
      };

      this.cargando = false;
      if (!this.perfilCargado) {
        this.perfilCargado = true;
        await this.cargarPerfil(user.id);
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }

  private async cargarPerfil(userId: string) {
    const guardado = await this.profilesService.upsertPerfil(this.perfil);
    if (!guardado) return;

    const existente = await this.profilesService.obtenerPerfil(userId);
    if (existente) {
      this.perfil = existente;
    }
  }

  async guardarPerfil() {
    if (!this.perfil.id) return;
    this.guardando = true;
    const exito = await this.profilesService.upsertPerfil(this.perfil);
    this.guardando = false;
    if (!exito) {
      console.error('No se pudo guardar el perfil');
    }
  }
}
