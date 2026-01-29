import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { pairGuard } from './core/guards/pair.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'home',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'viajes',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/viajes/viajes.component').then(m => m.ViajesComponent)
  },
  {
    path: 'calendario',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/calendario/calendario.component').then(m => m.CalendarioComponent)
  },
  {
    path: 'cosas-hacer',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/cosas-hacer/cosas-hacer.component').then(m => m.CosasHacerComponent)
  },
  {
    path: 'lugares',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/lugares/lugares.component').then(m => m.LugaresComponent)
  },
  {
    path: 'peliculas',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/peliculas/peliculas.component').then(m => m.PeliculasComponent)
  },
  {
    path: 'onboarding-pareja',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/onboarding-pareja/onboarding-pareja.component').then(m => m.OnboardingParejaComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard, pairGuard],
    loadComponent: () => import('./modules/perfil/perfil.component').then(m => m.PerfilComponent)
  }
];
