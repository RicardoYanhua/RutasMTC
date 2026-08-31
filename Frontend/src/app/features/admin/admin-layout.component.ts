import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ETIQUETA_ROL, RolPanel } from '../../core/models/auth.model';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

/** Un icono por entidad: identifica de un vistazo con qué rol se entró. */
const ICONO_POR_ROL: Record<RolPanel, IconName> = {
  perurail: 'train',
  travelgroup: 'leaf',
  mtc: 'landmark',
};

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  /** Público: la plantilla consulta permisos por módulo para armar el menú. */
  readonly auth = inject(AuthService);

  readonly sidebarAbierto = signal(false);
  /** Cerrar sesión es destructivo para el trabajo en curso: se confirma antes. */
  readonly confirmarSalida = signal(false);
  readonly usuario = this.auth.usuario;
  readonly etiquetaRol = computed(() => {
    const rol = this.auth.rol();
    return rol ? ETIQUETA_ROL[rol] : 'Operador';
  });
  readonly entidad = computed(() => this.usuario()?.entidad || this.etiquetaRol());
  readonly iconoRol = computed<IconName>(() => {
    const rol = this.auth.rol();
    return rol ? ICONO_POR_ROL[rol] : 'sliders';
  });

  /** Iniciales para el avatar: evita meter una foto genérica de relleno. */
  readonly iniciales = computed(() => {
    const u = this.usuario();
    const base = u?.nombreCompleto || u?.usuario || '';
    const partes = base.split(/[\s.]+/).filter(Boolean);
    if (!partes.length) return '··';
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  });

  toggleSidebar(): void {
    this.sidebarAbierto.update((v) => !v);
  }

  cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }

  pedirCerrarSesion(): void {
    this.sidebarAbierto.set(false);
    this.confirmarSalida.set(true);
  }

  cerrarSesion(): void {
    this.confirmarSalida.set(false);
    this.auth.logout();
  }

}
