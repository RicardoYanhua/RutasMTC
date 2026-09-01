import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import type { HeroSceneHandle } from './hero-scene.three';

/**
 * Contenedor Angular de la escena Three.js del hero. Solo gestiona el ciclo de
 * vida y el estado de carga; toda la lógica WebGL vive en `hero-scene.three.ts`.
 *
 * Three.js + GLTFLoader pesan bastante, así que el módulo se importa de forma
 * dinámica **después** del primer pintado: el titular y el CTA del hero no
 * esperan al bundle 3D (LCP), y el lienzo de tinta ya se ve mientras tanto.
 *
 * `setScroll` se expone hacia arriba para que la landing lo alimente desde su
 * IntersectionObserver: así el dolly de cámara sigue al scroll sin que la
 * escena tenga que suscribirse a eventos de scroll por su cuenta.
 */
@Component({
  selector: 'app-hero-scene',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #canvasContainer class="hero-scene" aria-hidden="true"></div>

    @if (estado() !== 'listo') {
      <p class="hero-scene__estado" role="status">
        @if (estado() === 'error') {
          <span class="hero-scene__texto">Vista 3D no disponible en este equipo</span>
        } @else {
          <span class="hero-scene__texto">Cargando el modelo del tren</span>
          <span class="hero-scene__barra">
            <span class="hero-scene__relleno" [style.transform]="'scaleX(' + progreso() + ')'"></span>
          </span>
        }
      </p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: absolute;
        inset: 0;
        border-radius: inherit;
        overflow: hidden;
      }
      /* El lienzo se disuelve por abajo en vez de terminar en un corte recto.
         Es la misma jugada que la niebla de la escena, pero en el plano de la
         página: la niebla difumina el fondo en profundidad y no puede hacer
         nada con el borde del canvas, que cae en primer término justo donde
         pasan raíl y traviesas.

         Va en máscara y no en un degradado de papel encima porque la máscara no
         presupone de qué color es lo que hay debajo: sirve igual cuando el
         panel de cifras se solapa sobre el pliegue. */
      .hero-scene {
        position: absolute;
        inset: 0;
        overflow: hidden;
        -webkit-mask-image: linear-gradient(to bottom, #000 76%, transparent 100%);
        mask-image: linear-gradient(to bottom, #000 76%, transparent 100%);
      }
      .hero-scene canvas {
        display: block;
      }

      /* Estado de carga del .glb: barra fina abajo a la derecha, sobre el papel
         del hero. No es un spinner genérico: informa del progreso real de
         descarga de un archivo de 11 MB. */
      .hero-scene__estado {
        position: absolute;
        right: clamp(16px, 4vw, 48px);
        bottom: clamp(20px, 4vw, 40px);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        margin: 0;
        font-size: 11.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-500);
      }
      .hero-scene__barra {
        display: block;
        width: 132px;
        height: 2px;
        background: var(--surface-3);
        border-radius: 999px;
        overflow: hidden;
      }
      .hero-scene__relleno {
        display: block;
        height: 100%;
        width: 100%;
        transform: scaleX(0);
        transform-origin: left center;
        background: var(--acc-500);
        transition: transform 0.3s var(--ease-io);
      }
      @media (max-width: 720px) {
        .hero-scene__texto {
          display: none;
        }
      }
    `,
  ],
})
export class HeroSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) private canvasContainer!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);

  readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  readonly progreso = signal(0);

  private handle?: HeroSceneHandle;
  private descartado = false;

  ngAfterViewInit(): void {
    // Fuera de la zona: el bucle de render no debe disparar detección de
    // cambios en cada frame. Los tres callbacks vuelven a entrar a mano.
    this.zone.runOutsideAngular(async () => {
      try {
        const { mountHeroScene } = await import('./hero-scene.three');
        if (this.descartado) return;
        this.handle = mountHeroScene(this.canvasContainer.nativeElement, {
          onProgress: (valor) => this.zone.run(() => this.progreso.set(valor)),
          onReady: () => this.zone.run(() => this.estado.set('listo')),
          onError: () => this.zone.run(() => this.estado.set('error')),
        });
      } catch {
        // Sin WebGL (o sin poder cargar el bundle) el hero se degrada a la
        // lámina de tinta lisa en vez de romper toda la landing.
        this.zone.run(() => this.estado.set('error'));
      }
    });
  }

  setScroll(progreso: number): void {
    this.handle?.setScroll(progreso);
  }

  ngOnDestroy(): void {
    this.descartado = true;
    this.handle?.dispose();
  }
}
