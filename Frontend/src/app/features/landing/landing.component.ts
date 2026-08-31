import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HeroSceneComponent } from './hero-scene.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../shared/components/image-slot/image-slot.component';
import { LeafletMapComponent, MapaMarcador } from '../../shared/components/map/leaflet-map.component';
import { iconoDeCategoria } from '../../shared/components/icon/icon.util';
import { EstacionService } from '../../core/services/estacion.service';
import { ZonaService } from '../../core/services/zona.service';
import { Estacion } from '../../core/models/estacion.model';
import { ZonaTuristica } from '../../core/models/zona.model';
import { Animacion, countUp, fadeUp, revealOnScroll, prefersReducedMotion } from '../../shared/animations/animar.util';

interface Paso {
  numero: string;
  titulo: string;
  detalle: string;
}

const PASOS: Paso[] = [
  { numero: '01', titulo: 'Tus preferencias', detalle: 'Intereses, esfuerzo máximo y minutos disponibles para caminar.' },
  { numero: '02', titulo: 'La estación', detalle: 'Punto de partida, con andenes, altitud y servicios de PeruRail.' },
  { numero: '03', titulo: 'Las alternativas', detalle: 'Zonas filtradas, clima del día, horario y tarifa del tren.' },
  { numero: '04', titulo: 'El informe', detalle: 'Un documento consolidado con la ruta peatonal de ida y vuelta.' },
];

const FUENTES = [
  { nombre: 'SENAMHI', via: 'Open-Meteo', aporta: 'Temperatura, probabilidad de lluvia, viento e índice UV del día del viaje.' },
  { nombre: 'PeruRail', via: 'Catálogo ferroviario', aporta: 'Estaciones, andenes, horarios de salida y retorno, y tarifa por tramo.' },
  { nombre: 'Travel Group Perú', via: 'Panel interno', aporta: 'Zonas turísticas, distancia a pie, dificultad, horarios e ingreso.' },
];

@Component({
  selector: 'app-landing',
  imports: [HeroSceneComponent, IconComponent, ImageSlotComponent, LeafletMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) private root!: ElementRef<HTMLElement>;
  @ViewChild('hero', { static: true }) private hero!: ElementRef<HTMLElement>;
  @ViewChild('escena', { static: true }) private escena!: HeroSceneComponent;

  private readonly router = inject(Router);
  private readonly estacionService = inject(EstacionService);
  private readonly zonaService = inject(ZonaService);

  readonly pasos = PASOS;
  readonly fuentes = FUENTES;

  readonly estaciones = signal<Estacion[]>([]);
  readonly zonas = signal<ZonaTuristica[]>([]);
  readonly cargando = signal(true);
  readonly estacionActiva = signal<number | null>(null);
  readonly estacionResaltada = signal<number | null>(null);

  /** Los cinco primeros destinos alimentan el bento; el resto vive en el planificador. */
  readonly destinos = computed(() => this.zonas().slice(0, 5));
  /** El layout asimétrico (1 celda grande + 4 pequeñas) solo cuadra exacto con cinco. */
  readonly bentoCompleto = computed(() => this.destinos().length === 5);

  readonly marcadores = computed<MapaMarcador[]>(() =>
    this.estaciones().map((e) => ({
      id: e.est_id_estacion,
      lat: e.est_latitud,
      lng: e.est_longitud,
      label: e.est_nombre,
      detalle: `${e.est_region} · ${e.est_altitud_msnm} msnm`,
    })),
  );

  readonly estacionElegida = computed(() =>
    this.estaciones().find((e) => e.est_id_estacion === this.estacionActiva()) ?? null,
  );

  /**
   * Relleno del encuadre del mapa a sección completa. Reserva el ancho de los
   * dos paneles superpuestos (`.mapa-pleno__capa`) para que ningún marcador
   * quede debajo de ellos. Bajo 1080px los paneles salen del lienzo y se
   * apilan, así que el relleno vuelve a ser el normal.
   */
  readonly anchoVentana = signal(typeof window === 'undefined' ? 1440 : window.innerWidth);
  readonly rellenoMapaInicio = computed<[number, number]>(() =>
    // Ancho del panel (372) + su margen (24) + media etiqueta permanente (~110),
    // que se centra sobre el marcador y sobresale por la izquierda.
    this.anchoVentana() > 1080 ? [510, 110] : [48, 64],
  );
  readonly rellenoMapaFin = computed<[number, number]>(() =>
    this.anchoVentana() > 1080 ? [420, 120] : [48, 72],
  );

  private animaciones: Animacion[] = [];
  /** Vigila la salida del hero para alimentar el dolly de la escena 3D. */
  private observadorHero?: IntersectionObserver;
  private onResize?: () => void;

  ngAfterViewInit(): void {
    this.animarHero();
    this.conectarEscenaAlScroll();
    this.observarAncho();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    for (const a of this.animaciones) a.kill();
    this.animaciones = [];
    this.observadorHero?.disconnect();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
  }

  /**
   * El relleno del encuadre del mapa depende del breakpoint (los paneles
   * flotantes solo se superponen por encima de 1080px). `resize` sí está
   * permitido: dispara en cambios de layout, no en cada frame de scroll.
   */
  private observarAncho(): void {
    this.onResize = () => this.anchoVentana.set(window.innerWidth);
    window.addEventListener('resize', this.onResize);
  }

  iconoCategoria(zona: ZonaTuristica) {
    return iconoDeCategoria(zona.zon_categoria);
  }

  seleccionarEstacion(id: number): void {
    this.estacionActiva.update((actual) => (actual === id ? null : id));
  }

  resaltarEstacion(id: number | null): void {
    this.estacionResaltada.set(id);
  }

  planificar(): void {
    this.router.navigateByUrl('/planificar/preferencias');
  }

  /**
   * Desplaza a una sección sin tocar la URL (el header sí usa fragmentos del
   * router). La centra en pantalla cuando cabe entera; si es más alta que el
   * viewport, la alinea arriba, donde `scroll-margin-top` ya deja libre la
   * altura del header pegajoso.
   */
  irA(id: string): void {
    const destino = document.getElementById(id);
    if (!destino) return;
    const cabe = destino.getBoundingClientRect().height <= window.innerHeight;
    destino.scrollIntoView({ block: cabe ? 'center' : 'start' });
  }

  /** Entrada del hero: la jerarquía aparece en el orden en que se lee. */
  private animarHero(): void {
    fadeUp(this.hero.nativeElement.querySelectorAll('.hero__item'), { stagger: 0.09, y: 24, duration: 0.75 });
  }

  /**
   * Alimenta el dolly de cámara de la escena Three.js con el progreso de salida
   * del hero.
   *
   * Se resuelve con un IntersectionObserver de umbrales finos en vez de un
   * listener de `scroll`: el navegador entrega la fracción visible ya calculada,
   * sin obligar a leer el layout en cada frame. Como el hero mide una pantalla,
   * lo que queda fuera equivale al avance del scroll, así que el progreso es
   * `1 - intersectionRatio`.
   *
   * Los ~50 escalones bastan porque la escena suaviza el valor por su cuenta
   * (`scrollSuave += (objetivo - scrollSuave) * 0.06`).
   */
  private conectarEscenaAlScroll(): void {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const umbrales = Array.from({ length: 51 }, (_, i) => i / 50);
    this.observadorHero = new IntersectionObserver(
      ([entrada]) => this.escena.setScroll(1 - entrada.intersectionRatio),
      { threshold: umbrales },
    );
    this.observadorHero.observe(this.hero.nativeElement);
  }

  private cargarDatos(): void {
    forkJoin({ estaciones: this.estacionService.listar(), zonas: this.zonaService.listar() }).subscribe({
      next: ({ estaciones, zonas }) => {
        this.estaciones.set(estaciones);
        this.zonas.set(zonas);
        this.cargando.set(false);
        queueMicrotask(() => this.activarRevelados(estaciones, zonas));
      },
      error: () => this.cargando.set(false),
    });
  }

  /**
   * Se llama una vez con los datos ya pintados: los observadores necesitan las
   * alturas definitivas para decidir qué está dentro de pantalla.
   */
  private activarRevelados(estaciones: Estacion[], zonas: ZonaTuristica[]): void {
    const scope = this.root.nativeElement;
    this.animaciones.push(...revealOnScroll(scope));

    const cifras: Array<[string, number]> = [
      ['estaciones', estaciones.length],
      ['zonas', zonas.length],
      ['regiones', new Set(estaciones.map((e) => e.est_region)).size],
      ['fuentes', FUENTES.length],
    ];
    for (const [clave, valor] of cifras) {
      const el = scope.querySelector<HTMLElement>(`[data-cifra="${clave}"]`);
      const animacion = el ? countUp(el, valor) : null;
      if (animacion) this.animaciones.push(animacion);
    }
  }
}
