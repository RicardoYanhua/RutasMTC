import { Routes } from '@angular/router';
import { adminGuard, edicionGuard, moduloGuard } from './core/guards/admin.guard';
import { guestGuard } from './core/guards/guest.guard';
import { estacionStepGuard, alternativasStepGuard, rutaStepGuard, informeStepGuard } from './core/guards/wizard-step.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'planificar',
    loadComponent: () => import('./features/wizard/wizard-layout.component').then((m) => m.WizardLayoutComponent),
    children: [
      { path: '', redirectTo: 'preferencias', pathMatch: 'full' },
      {
        path: 'preferencias',
        loadComponent: () => import('./features/wizard/preferencias/preferencias.component').then((m) => m.PreferenciasComponent),
      },
      {
        path: 'estacion',
        canActivate: [estacionStepGuard],
        loadComponent: () => import('./features/wizard/estacion/estacion.component').then((m) => m.EstacionComponent),
      },
      {
        path: 'alternativas',
        canActivate: [alternativasStepGuard],
        loadComponent: () => import('./features/wizard/alternativas/alternativas.component').then((m) => m.AlternativasComponent),
      },
      {
        path: 'ruta',
        canActivate: [rutaStepGuard],
        loadComponent: () => import('./features/wizard/ruta/ruta.component').then((m) => m.RutaComponent),
      },
      {
        path: 'informe/:codigo',
        canActivate: [informeStepGuard],
        loadComponent: () => import('./features/wizard/informe/informe.component').then((m) => m.InformeComponent),
      },
      {
        path: 'informe',
        canActivate: [informeStepGuard],
        loadComponent: () => import('./features/wizard/informe/informe.component').then((m) => m.InformeComponent),
      },
    ],
  },
  {
    path: 'admin/login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      // Sin ruta fija de entrada: cada rol aterriza en el módulo que gestiona
      // (ver `AuthService.rutaInicial`). Un `redirectTo` estático mandaría al
      // operador de PeruRail a zonas, que no son suyas.
      { path: '', redirectTo: 'zonas', pathMatch: 'full' },

      // — Zonas turísticas: dueño Travel Group —
      {
        path: 'zonas',
        canActivate: [moduloGuard('zonas')],
        loadComponent: () => import('./features/admin/zonas/zonas.component').then((m) => m.ZonasComponent),
      },
      // 'nueva' va antes de ':id' para que no se interprete como identificador.
      {
        path: 'zonas/nueva',
        canActivate: [edicionGuard('zonas')],
        loadComponent: () => import('./features/admin/zonas/zona-form.component').then((m) => m.ZonaFormComponent),
      },
      {
        path: 'zonas/:id/editar',
        canActivate: [edicionGuard('zonas')],
        loadComponent: () => import('./features/admin/zonas/zona-form.component').then((m) => m.ZonaFormComponent),
      },

      // — Estaciones: dueño PeruRail —
      {
        path: 'estaciones',
        canActivate: [moduloGuard('estaciones')],
        loadComponent: () => import('./features/admin/estaciones/estaciones.component').then((m) => m.EstacionesComponent),
      },
      {
        path: 'estaciones/nueva',
        canActivate: [edicionGuard('estaciones')],
        loadComponent: () =>
          import('./features/admin/estaciones/estacion-form.component').then((m) => m.EstacionFormComponent),
      },
      {
        path: 'estaciones/:id/editar',
        canActivate: [edicionGuard('estaciones')],
        loadComponent: () =>
          import('./features/admin/estaciones/estacion-form.component').then((m) => m.EstacionFormComponent),
      },

      // — Horarios y tarifas: dueño PeruRail —
      {
        path: 'servicios',
        canActivate: [moduloGuard('servicios')],
        loadComponent: () => import('./features/admin/servicios/servicios.component').then((m) => m.ServiciosComponent),
      },
      {
        path: 'servicios/nuevo',
        canActivate: [edicionGuard('servicios')],
        loadComponent: () =>
          import('./features/admin/servicios/servicio-form.component').then((m) => m.ServicioFormComponent),
      },
      {
        path: 'servicios/:id/editar',
        canActivate: [edicionGuard('servicios')],
        loadComponent: () =>
          import('./features/admin/servicios/servicio-form.component').then((m) => m.ServicioFormComponent),
      },

      // — Plataforma: solo el gestor MTC —
      {
        path: 'publicacion',
        canActivate: [moduloGuard('publicacion')],
        loadComponent: () =>
          import('./features/admin/publicacion/publicacion.component').then((m) => m.PublicacionComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
