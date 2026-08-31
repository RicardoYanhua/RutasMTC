import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginModalService } from '../../../core/services/login-modal.service';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { CuentaDemo, DESCRIPCION_ROL, ETIQUETA_ROL, RolPanel } from '../../../core/models/auth.model';

/** Un icono por entidad, el mismo que usa la cabecera del panel. */
const ICONO_POR_ROL: Record<RolPanel, IconName> = {
  perurail: 'train',
  travelgroup: 'leaf',
  mtc: 'landmark',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notificaciones = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly modal = inject(LoginModalService);

  /** true cuando se muestra como popup sobre la pantalla actual (ver `LoginModalService`); false cuando es la ruta /admin/login de toda la vida (redirects de guards). */
  readonly modoModal = input(false);

  readonly enviando = signal(false);
  readonly mostrarClave = signal(false);
  /** Atajos de acceso por rol. Los sirve el backend; si están apagados, llega vacío. */
  readonly cuentas = signal<CuentaDemo[]>([]);

  ngOnInit(): void {
    this.auth.cuentasDemo().subscribe({
      next: (cuentas) => this.cuentas.set(cuentas),
      // Sin atajos el formulario sigue siendo perfectamente usable.
      error: () => this.cuentas.set([]),
    });
  }

  etiquetaRol(rol: RolPanel): string {
    return ETIQUETA_ROL[rol];
  }

  descripcionRol(rol: RolPanel): string {
    return DESCRIPCION_ROL[rol];
  }

  iconoRol(rol: RolPanel): IconName {
    return ICONO_POR_ROL[rol];
  }

  toggleClave(): void {
    this.mostrarClave.update((v) => !v);
  }

  /** Botón de cierre / click en el fondo: si es popup solo se oculta (la página de atrás sigue igual); si es la ruta dedicada /admin/login, vuelve al inicio porque no hay "atrás" al que volver. */
  cerrar(): void {
    if (this.modoModal()) this.modal.cerrar();
    else this.router.navigateByUrl('/');
  }

  /** Para los enlaces que ya navegan por sí mismos (routerLink="/"): resetea el estado del popup, si estaba abierto como overlay, para que no reaparezca en la página de destino. */
  cerrarPopup(): void {
    this.modal.cerrar();
  }

  readonly form = this.fb.nonNullable.group({
    usuario: ['', [Validators.required]],
    clave: ['', [Validators.required, Validators.minLength(4)]],
  });

  get usuario() {
    return this.form.controls.usuario;
  }
  get clave() {
    return this.form.controls.clave;
  }

  /**
   * Rellena el formulario con una de las cuentas de demostración y entra.
   * Es un atajo del entorno de prueba: el backend deja de servir la lista
   * poniendo DEMO_ACCOUNTS=off, y entonces este bloque no se pinta.
   */
  entrarComo(cuenta: CuentaDemo): void {
    this.form.setValue({ usuario: cuenta.usuario, clave: cuenta.clave });
    this.enviar();
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.modal.cerrar();
        this.notificaciones.exito(`Bienvenido, ${res.usuario.entidad ?? ETIQUETA_ROL[res.usuario.rol]}.`);
        // Cada rol aterriza en el módulo que realmente gestiona.
        this.router.navigateByUrl(this.auth.rutaInicial());
      },
      error: () => this.enviando.set(false),
    });
  }
}
