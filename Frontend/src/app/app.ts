import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ToastsComponent } from './shared/components/toasts/toasts.component';
import { IconComponent } from './shared/components/icon/icon.component';
import { LoginComponent } from './features/auth/login/login.component';
import { LoginModalService } from './core/services/login-modal.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ToastsComponent, IconComponent, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('centinela', { static: true }) private centinela!: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loginModal = inject(LoginModalService);

  readonly esAdmin = signal(this.calcularEsAdmin(this.router.url));
  readonly menuMovilAbierto = signal(false);
  /** El header solo dibuja su hairline inferior cuando la página ya se movió. */
  readonly headerFijado = signal(false);
  readonly anio = new Date().getFullYear();

  private observador?: IntersectionObserver;

  constructor() {
    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: NavigationEnd) => {
      this.esAdmin.set(this.calcularEsAdmin(e.urlAfterRedirects));
      this.menuMovilAbierto.set(false);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  /**
   * Un centinela de 1px arriba de la página, observado con IntersectionObserver:
   * cuando deja de estar visible, la página ya scrolleó y el header dibuja su
   * filete. Nada de `window.addEventListener('scroll')`, que obligaría a hacer
   * trabajo de layout en cada frame para pintar una línea de un píxel.
   */
  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observador = new IntersectionObserver(([entrada]) => this.headerFijado.set(!entrada.isIntersecting), {
      threshold: 0,
    });
    this.observador.observe(this.centinela.nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  /** El login vive bajo /admin/login pero se muestra como popup sobre el sitio público, así que conserva el header y el footer públicos. */
  private calcularEsAdmin(url: string): boolean {
    return url.startsWith('/admin') && !url.startsWith('/admin/login');
  }

  toggleMenu(): void {
    this.menuMovilAbierto.update((v) => !v);
  }

  abrirLoginDesdeMenu(): void {
    this.menuMovilAbierto.set(false);
    this.loginModal.abrir();
  }
}
