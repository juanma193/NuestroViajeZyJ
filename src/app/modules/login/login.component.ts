import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  cargando = false;

  constructor(private authService: AuthService, private router: Router) {}

  async loginGoogle() {
    this.cargando = true;
    const redirectTo = window.location.origin;
    const { error } = await this.authService.signInWithGoogle(redirectTo);
    if (error) {
      console.error('Error login Google:', error);
      this.cargando = false;
    }
  }

  async continuar() {
    await this.router.navigate(['/inicio']);
  }
}
