import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PairService } from '../../core/services/pair.service';

@Component({
  selector: 'app-onboarding-pareja',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding-pareja.component.html',
})
export class OnboardingParejaComponent {
  cargando = false;
  error = '';
  nombrePareja = '';
  inviteCode = '';

  constructor(private pairService: PairService, private router: Router) {}

  async crearPareja() {
    this.error = '';
    this.cargando = true;
    const parejaId = await this.pairService.createPair(this.nombrePareja.trim() || undefined);
    this.cargando = false;

    if (!parejaId) {
      this.error = 'No se pudo crear la pareja. Intenta nuevamente.';
      return;
    }

    this.pairService.setParejaId(parejaId);
    await this.router.navigate(['/home']);
  }

  async unirsePareja() {
    this.error = '';
    const code = this.inviteCode.trim().toUpperCase();
    if (!code) {
      this.error = 'Ingresa un código válido.';
      return;
    }

    this.cargando = true;
    const parejaId = await this.pairService.joinByCode(code);
    this.cargando = false;

    if (!parejaId) {
      this.error = 'Código inválido o ya perteneces a la pareja.';
      return;
    }

    this.pairService.setParejaId(parejaId);
    await this.router.navigate(['/home']);
  }
}
