import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    loadComponent: () => import('./modules/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'viajes',
    loadComponent: () => import('./modules/viajes/viajes.component').then(m => m.ViajesComponent)
  },
  {
    path: 'calendario',
    loadComponent: () => import('./modules/calendario/calendario.component').then(m => m.CalendarioComponent)
  },
  {
    path: 'cosas-hacer',
    loadComponent: () => import('./modules/cosas-hacer/cosas-hacer.component').then(m => m.CosasHacerComponent)
  },
  {
    path: 'lugares',
    loadComponent: () => import('./modules/lugares/lugares.component').then(m => m.LugaresComponent)
  },
  {
    path: 'peliculas',
    loadComponent: () => import('./modules/peliculas/peliculas.component').then(m => m.PeliculasComponent)
  }
];
