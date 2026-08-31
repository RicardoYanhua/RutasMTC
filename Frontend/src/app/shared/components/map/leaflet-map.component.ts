import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';
import { IconComponent } from '../icon/icon.component';
import { prefersReducedMotion, pulso } from '../../animations/animar.util';

export interface MapaMarcador {
  id: number;
  lat: number;
  lng: number;
  label: string;
  /** Segunda línea del tooltip (región, altitud, lo que aporte contexto). */
  detalle?: string;
}

/* Espejo de los tokens del sistema. Leaflet pinta sobre canvas/SVG y no lee
   custom properties, así que los valores viven aquí como constantes. */
const ACC_500 = '#e5372a';
const ACC_050 = '#fdf1ef';

/** Vista de reserva cuando todavía no hay marcadores: Valle Sagrado, Cusco. */
const CENTRO_POR_DEFECTO: [number, number] = [-13.3, -72.1];

/**
 * Mapa blanco e interactivo del sistema.
 *
 * Teselas OSM lavadas por CSS (`.leaflet-tile-pane`, ver styles.css) hasta
 * dejar una lámina casi blanca: la única saturación de la escena son los
 * marcadores de ubicación en rojo y el círculo de alcance.
 *
 * Por defecto el mapa NO es manipulable (`interactivo = false`): ni zoom, ni
 * arrastre, ni controles. Está para situar los puntos, no para explorarlos, y
 * así no compite nunca con el scroll de la página ni se queda descuadrado.
 * `interactivo = true` devuelve zoom, paneo y la pila de controles.
 *
 * Interacción que se conserva siempre:
 *  · hover sincronizado en ambos sentidos con la lista (`hoveredId` /
 *    `markerHover`), que es lo que convierte lista y mapa en una sola pieza
 *  · clic en el marcador para seleccionar (`markerClick`)
 *  · tooltip al pasar, etiqueta permanente en el nodo activo (o en todos, con
 *    `etiquetasPermanentes`)
 *  · círculo discontinuo opcional con el alcance a pie (`radioKm`)
 *
 * El encuadre automático solo se recalcula cuando cambia el conjunto de puntos
 * (no en cada hover): de lo contrario el mapa pelearía contra el paneo manual
 * del usuario cada vez que el cursor roza una tarjeta de la lista.
 */
@Component({
  selector: 'app-leaflet-map',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-frame" [class]="'map-frame map-frame--' + alto()">
      <div #mapEl class="map-frame__canvas" role="application" [attr.aria-label]="ariaLabel()"></div>
      @if (interactivo()) {
        <div class="map-zoom no-imprimir">
          <button type="button" (click)="acercar()" aria-label="Acercar el mapa">
            <app-icon name="zoom-in" [size]="17" />
          </button>
          <button type="button" (click)="alejar()" aria-label="Alejar el mapa">
            <app-icon name="zoom-out" [size]="17" />
          </button>
          <button type="button" (click)="reencuadrar()" aria-label="Reencuadrar sobre todos los puntos">
            <app-icon name="crosshair" [size]="17" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class LeafletMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  readonly markers = input<MapaMarcador[]>([]);
  readonly seleccionadoId = input<number | null>(null);
  /** Id resaltado desde la lista lateral (hover), sin llegar a seleccionarlo. */
  readonly hoveredId = input<number | null>(null);
  readonly zoom = input(12);
  readonly alto = input<'fill' | 'tall' | 'mid' | 'compact'>('tall');
  readonly ariaLabel = input('Mapa de estaciones');
  /** Alcance a pie alrededor del punto activo, en kilómetros. */
  readonly radioKm = input<number | null>(null);
  readonly mostrarRadio = input(false);
  /**
   * Etiqueta permanente en TODOS los puntos, no solo en el activo. Se usa
   * cuando el mapa ocupa la sección entera y el brief pide leer los datos de
   * cada estación sin recorrerlas con el cursor una a una.
   */
  readonly etiquetasPermanentes = input(false);
  /**
   * Mapa de solo lectura: sin zoom (ni rueda, ni doble clic, ni pellizco, ni
   * teclado), sin arrastre y sin controles.
   *
   * Es el modo por defecto de todo el sitio público. El mapa está para SITUAR
   * las estaciones, no para explorarlas: dejando el zoom activo, la rueda del
   * ratón se convierte en una lotería (¿acerco el mapa o bajo la página?) y en
   * móvil el pellizco compite con el desplazamiento. Los marcadores siguen
   * siendo clicables, que es la interacción que sí aporta.
   */
  readonly interactivo = input(false);
  /**
   * Relleno del encuadre automático, en píxeles: `[izquierda, arriba]` y
   * `[derecha, abajo]`. Es lo que impide que un panel superpuesto sobre el
   * lienzo (ver `.mapa-pleno__capa`) tape marcadores: el `fitBounds` reserva
   * ese ancho y todos los puntos quedan en la zona visible del mapa.
   */
  readonly rellenoInicio = input<[number, number]>([64, 64]);
  readonly rellenoFin = input<[number, number]>([72, 72]);


  readonly markerClick = output<number>();
  readonly markerHover = output<number | null>();

  private mapa: L.Map | null = null;
  private capas = new Map<number, L.Marker>();
  private circulo: L.Circle | null = null;
  private ultimaSeleccion: number | null = null;
  private ultimaFirma = '';
  private ultimasEtiquetas: boolean | null = null;

  constructor() {
    effect(() => {
      const markers = this.markers();
      const seleccion = this.seleccionadoId();
      const resaltado = this.hoveredId();
      const radio = this.radioKm();
      const verRadio = this.mostrarRadio();
      // Se leen aquí (dentro del effect) para que un cambio de relleno o de
      // etiquetas también dispare la resincronización.
      this.etiquetasPermanentes();
      this.rellenoInicio();
      this.rellenoFin();
      queueMicrotask(() => {
        this.sincronizarMarcadores(markers, seleccion);
        this.aplicarResaltado(resaltado, seleccion);
        this.pintarRadio(markers, seleccion, radio, verRadio);
      });
    });
  }

  ngAfterViewInit(): void {
    const interactivo = this.interactivo();
    const mapa = L.map(this.mapEl.nativeElement, {
      zoomControl: false,
      attributionControl: false,
      // Cuando no es interactivo se desactiva TODA vía de manipulación, no solo
      // la rueda: doble clic, pellizco, arrastre, teclado y caja de zoom. Si se
      // deja alguna abierta, el mapa se descuadra y ya no vuelve a su encuadre.
      scrollWheelZoom: false,
      dragging: interactivo,
      touchZoom: interactivo,
      doubleClickZoom: interactivo,
      boxZoom: interactivo,
      keyboard: interactivo,
      inertia: interactivo,
      inertiaDeceleration: 2400,
      zoomSnap: 0.25,
    });

    // Abajo a la derecha, debajo de la pila de zoom: abajo a la izquierda la
    // taparía el panel flotante de la lista.
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(mapa);

    // Teselas OSM estándar: sin clave de API y sin límite de uso comercial que
    // gestionar. El aspecto de lámina blanca lo pone íntegramente el filtro CSS
    // de `.leaflet-tile-pane` (ver styles.css), no el proveedor.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapa);

    if (interactivo) {
      // La rueda solo hace zoom con el puntero dentro: fuera, la página scrollea.
      this.mapEl.nativeElement.addEventListener('mouseenter', () => mapa.scrollWheelZoom.enable());
      this.mapEl.nativeElement.addEventListener('mouseleave', () => mapa.scrollWheelZoom.disable());
    }

    // Leaflet necesita una vista antes de que `getZoom()` devuelva algo: sin
    // ella, el zoom es `undefined`, el `setView` posterior recibe NaN y el
    // proveedor de teselas entra en bucle ("infinite number of tiles"). Pasa en
    // los mapas que arrancan ya con un punto seleccionado (paso "ruta").
    const primero = this.markers()[0];
    mapa.setView(primero ? [primero.lat, primero.lng] : CENTRO_POR_DEFECTO, this.zoom());

    this.mapa = mapa;
    this.sincronizarMarcadores(this.markers(), this.seleccionadoId());
    this.aplicarResaltado(this.hoveredId(), this.seleccionadoId());
    this.pintarRadio(this.markers(), this.seleccionadoId(), this.radioKm(), this.mostrarRadio());
  }

  ngOnDestroy(): void {
    // Se sueltan las capas antes que el mapa y se aísla el desmontaje: un error
    // al destruir Leaflet no debe abortar la navegación de Angular.
    try {
      this.circulo?.remove();
      for (const capa of this.capas.values()) capa.remove();
      this.mapa?.remove();
    } catch {
      /* el contenedor ya no estaba en el DOM */
    }
    this.capas.clear();
    this.circulo = null;
    this.mapa = null;
  }

  acercar(): void {
    this.mapa?.zoomIn();
  }

  alejar(): void {
    this.mapa?.zoomOut();
  }

  reencuadrar(): void {
    this.ajustarVista(this.markers(), true);
  }

  /**
   * Marcador de ubicación clásico (gota con perforación central) en el rojo de
   * marca, no un nodo abstracto: sobre una lámina casi blanca el pin se lee de
   * inmediato como "aquí hay un sitio". El ancla va en la punta inferior, que es
   * el punto que realmente señala la coordenada.
   */
  private crearIcono(activo: boolean): L.DivIcon {
    const halo = activo ? '<span class="mk__halo"></span>' : '';
    return L.divIcon({
      className: '',
      html: `<span class="mk${activo ? ' mk--active' : ''}">
        ${halo}
        <svg class="mk__pin" width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
          <path d="M13 33.2C13 33.2 25 20.6 25 13A12 12 0 1 0 1 13c0 7.6 12 20.2 12 20.2z"/>
          <circle cx="13" cy="12.8" r="4.3"/>
        </svg>
      </span>`,
      iconSize: [26, 34],
      iconAnchor: [13, 33],
    });
  }

  private sincronizarMarcadores(markers: MapaMarcador[], seleccionadoId: number | null): void {
    const mapa = this.mapa;
    if (!mapa) return;

    for (const [id, capa] of this.capas) {
      if (!markers.some((m) => m.id === id)) {
        capa.remove();
        this.capas.delete(id);
      }
    }

    const cambioSeleccion = seleccionadoId !== this.ultimaSeleccion;
    const etiquetas = this.etiquetasPermanentes();
    const cambioEtiquetas = etiquetas !== this.ultimasEtiquetas;
    this.ultimasEtiquetas = etiquetas;

    for (const punto of markers) {
      const activo = punto.id === seleccionadoId;
      let capa = this.capas.get(punto.id);

      if (!capa) {
        capa = L.marker([punto.lat, punto.lng], { icon: this.crearIcono(activo), title: punto.label, riseOnHover: true });
        capa.on('click', () => this.markerClick.emit(punto.id));
        capa.on('mouseover', () => this.markerHover.emit(punto.id));
        capa.on('mouseout', () => this.markerHover.emit(null));
        capa.addTo(mapa);
        this.capas.set(punto.id, capa);
        this.enlazarTooltip(capa, punto, activo);
      } else {
        capa.setLatLng([punto.lat, punto.lng]);
        // Solo se reconstruye el icono cuando cambia el estado seleccionado:
        // `setIcon` recrea el nodo del DOM y perdería el `:hover` del navegador.
        if (cambioSeleccion || cambioEtiquetas) {
          if (cambioSeleccion) capa.setIcon(this.crearIcono(activo));
          this.enlazarTooltip(capa, punto, activo);
        }
      }
    }

    // Reencuadre general solo cuando cambia el conjunto de puntos. Si se
    // recalculase en cada efecto, cada hover devolvería el mapa a su encuadre
    // inicial y anularía el paneo manual.
    const firma = markers.map((m) => `${m.id}:${m.lat},${m.lng}`).join('|');
    if (firma !== this.ultimaFirma) {
      this.ultimaFirma = firma;
      if (seleccionadoId === null) this.ajustarVista(markers, false);
    }

    if (cambioSeleccion && seleccionadoId !== null) {
      const punto = markers.find((m) => m.id === seleccionadoId);
      if (punto) {
        // Con etiquetas fijas el encuadre NO se mueve: el trabajo de esa vista
        // es tener todos los puntos y sus datos a la vista a la vez, y volar
        // hacia uno dejaría al resto fuera de pantalla. La selección se lee por
        // el marcador y por la tarjeta, que ya es señal suficiente.
        if (!etiquetas) {
          const actual = mapa.getZoom();
          const destino = Math.max(Number.isFinite(actual) ? actual : this.zoom(), this.zoom());
          if (prefersReducedMotion()) mapa.setView([punto.lat, punto.lng], destino);
          else mapa.flyTo([punto.lat, punto.lng], destino, { duration: 0.9 });
        }
        queueMicrotask(() => pulso(this.capas.get(seleccionadoId)?.getElement()?.querySelector('.mk__pin') ?? null));
      }
    }
    this.ultimaSeleccion = seleccionadoId;
  }

  private enlazarTooltip(capa: L.Marker, punto: MapaMarcador, activo: boolean): void {
    const detalle = punto.detalle ? `<small>${punto.detalle}</small>` : '';
    const fijas = this.etiquetasPermanentes();
    capa.unbindTooltip();

    // Tres presentaciones, una por estado:
    //   activo            -> etiqueta oscura permanente, la más contrastada
    //   fijas (todos)     -> píldora de tinta esmerilada, siempre visible
    //   resto             -> tooltip claro, solo al pasar el cursor
    const className = activo ? 'map-tip' : fijas ? 'map-tip map-tip--fija' : 'map-tip map-tip--plain';
    capa.bindTooltip(`${punto.label}${detalle}`, {
      direction: 'top',
      offset: [0, -38],
      className,
      permanent: activo || fijas,
      opacity: 1,
      // Con etiquetas fijas, dejarlas fuera del flujo de eventos evita que
      // roben el clic al marcador que hay debajo.
      interactive: false,
    });
  }

  /** Resalta el nodo que la lista tiene bajo el cursor, sin recrear el icono. */
  private aplicarResaltado(resaltadoId: number | null, seleccionadoId: number | null): void {
    for (const [id, capa] of this.capas) {
      const nodo = capa.getElement()?.querySelector('.mk');
      if (!nodo) continue;
      nodo.classList.toggle('mk--hover', id === resaltadoId && id !== seleccionadoId);
    }
  }

  private ajustarVista(markers: MapaMarcador[], animar: boolean): void {
    const mapa = this.mapa;
    if (!mapa || !markers.length) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    const opciones = {
      paddingTopLeft: this.rellenoInicio(),
      paddingBottomRight: this.rellenoFin(),
      maxZoom: this.zoom(),
    };
    if (animar && !prefersReducedMotion()) mapa.flyToBounds(bounds, { ...opciones, duration: 0.8 });
    else mapa.fitBounds(bounds, opciones);
  }

  /** Círculo discontinuo con el alcance a pie desde el punto seleccionado. */
  private pintarRadio(
    markers: MapaMarcador[],
    seleccionadoId: number | null,
    km: number | null,
    visible: boolean,
  ): void {
    const mapa = this.mapa;
    if (!mapa) return;

    const punto = markers.find((m) => m.id === seleccionadoId);
    if (!visible || !km || !punto) {
      this.circulo?.remove();
      this.circulo = null;
      return;
    }

    const centro: L.LatLngExpression = [punto.lat, punto.lng];
    const radio = km * 1000;
    if (this.circulo) {
      this.circulo.setLatLng(centro).setRadius(radio);
      return;
    }
    this.circulo = L.circle(centro, {
      radius: radio,
      color: ACC_500,
      weight: 1.5,
      dashArray: '5 6',
      fillColor: ACC_050,
      fillOpacity: 0.45,
      interactive: false,
    }).addTo(mapa);
  }
}
