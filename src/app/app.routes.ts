import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'viajes',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/viajes/viajes.component').then(m => m.ViajesComponent)
  },
  {
    path: 'calendario',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/calendario/calendario.component').then(m => m.CalendarioComponent)
  },
  {
    path: 'cosas-hacer',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/cosas-hacer/cosas-hacer.component').then(m => m.CosasHacerComponent)
  },
  {
    path: 'lugares',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/lugares/lugares.component').then(m => m.LugaresComponent)
  },
  {
    path: 'peliculas',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/peliculas/peliculas.component').then(m => m.PeliculasComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./modules/perfil/perfil.component').then(m => m.PerfilComponent)
  }
];
