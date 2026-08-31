import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EstacionService } from '../../../core/services/estacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EstacionForm } from '../../../core/models/estacion.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { LeafletMapComponent, MapaMarcador } from '../../../shared/components/map/leaflet-map.component';

/** Formatos que acepta el endpoint de subida (ver upload.middleware.js). */
const FORMATOS = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Alta y edición de una estación ferroviaria. Dueño del dato: PeruRail.
 *
 * La fotografía no es decorativa: es el fondo de la tarjeta de estación en el
 * paso 2 del planificador, así que conviene una vista general del andén o de la
 * fachada, no un detalle.
 *
 * Las coordenadas llevan una previsualización en mapa bajo los campos. Escribir
 * una latitud a mano es fácil de equivocar por un signo, y ver el punto caer en
 * el sitio equivocado lo delata al instante.
 */
@Component({
  selector: 'app-admin-estacion-form',
  imports: [ReactiveFormsModule, IconComponent, ImageSlotComponent, LeafletMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estacion-form.component.html',
  styleUrls: ['../admin-shared.css'],
})
export class EstacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly estacionService = inject(EstacionService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatos = FORMATOS;

  readonly editandoId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly subiendo = signal(false);
  readonly errorImagen = signal<string | null>(null);
  readonly imagenUrl = signal<string | null>(null);

  readonly esEdicion = computed(() => this.editandoId() !== null);
  readonly titulo = computed(() => (this.esEdicion() ? 'Editar estación' : 'Nueva estación ferroviaria'));

  readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{2,10}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    region: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    altitudMsnm: [null as number | null, [Validators.required, Validators.min(0), Validators.max(6000)]],
    andenes: [1 as number | null, [Validators.required, Validators.min(1), Validators.max(30)]],
    latitud: [null as number | null, [Validators.required, Validators.min(-19), Validators.max(0)]],
    longitud: [null as number | null, [Validators.required, Validators.min(-82), Validators.max(-68)]],
    badge: ['', [Validators.maxLength(60)]],
  });

  /** Punto de previsualización. Vacío mientras las coordenadas no sean válidas. */
  readonly marcadorPrevio = signal<MapaMarcador[]>([]);

  ngOnInit(): void {
    // Cada cambio de coordenadas repinta el punto: la comprobación es inmediata.
    this.form.controls.latitud.valueChanges.subscribe(() => this.actualizarPrevio());
    this.form.controls.longitud.valueChanges.subscribe(() => this.actualizarPrevio());
    this.form.controls.nombre.valueChanges.subscribe(() => this.actualizarPrevio());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.editandoId.set(id);
    this.cargando.set(true);
    this.estacionService.obtener(id).subscribe({
      next: (estacion) => {
        this.form.setValue({
          codigo: estacion.est_codigo,
          nombre: estacion.est_nombre,
          region: estacion.est_region,
          altitudMsnm: estacion.est_altitud_msnm,
          andenes: estacion.est_andenes,
          latitud: Number(estacion.est_latitud),
          longitud: Number(estacion.est_longitud),
          badge: estacion.est_badge ?? '',
        });
        this.imagenUrl.set(estacion.est_imagen_url);
        this.cargando.set(false);
        this.actualizarPrevio();
      },
      error: () => {
        this.notificaciones.error('No se encontró la estación solicitada.');
        this.volver();
      },
    });
  }

  private actualizarPrevio(): void {
    const lat = Number(this.form.controls.latitud.value);
    const lng = Number(this.form.controls.longitud.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      this.marcadorPrevio.set([]);
      return;
    }
    this.marcadorPrevio.set([
      {
        id: 1,
        lat,
        lng,
        label: this.form.controls.nombre.value || 'Estación sin nombre',
        detalle: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      },
    ]);
  }

  /** Sube el archivo elegido y deja su ruta lista para guardarse con el formulario. */
  onArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.errorImagen.set(null);

    if (!FORMATOS.split(',').includes(archivo.type)) {
      this.errorImagen.set('Formato no admitido. Usa JPG, PNG, WebP o AVIF.');
      input.value = '';
      return;
    }
    if (archivo.size > MAX_BYTES) {
      this.errorImagen.set('La imagen supera los 4 MB permitidos.');
      input.value = '';
      return;
    }

    this.subiendo.set(true);
    this.estacionService.subirImagen(archivo).subscribe({
      next: (url) => {
        this.imagenUrl.set(url);
        this.subiendo.set(false);
        input.value = '';
      },
      error: () => {
        this.errorImagen.set('No se pudo subir la imagen. Inténtalo de nuevo.');
        this.subiendo.set(false);
        input.value = '';
      },
    });
  }

  /**
   * Descarta la imagen del formulario. El archivo en disco lo retira el backend
   * al guardar, cuando ya sabe que la estación se quedó sin foto.
   */
  quitarImagen(): void {
    this.imagenUrl.set(null);
    this.errorImagen.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificaciones.error('Revisa los campos marcados antes de guardar.');
      return;
    }

    this.enviando.set(true);
    const valores: EstacionForm = { ...this.form.getRawValue(), imagenUrl: this.imagenUrl() };
    const id = this.editandoId();
    const operacion = id ? this.estacionService.actualizar(id, valores) : this.estacionService.crear(valores);

    operacion.subscribe({
      next: (estacion) => {
        this.notificaciones.exito(
          id
            ? 'Estación actualizada.'
            : `Estación "${estacion.est_nombre}" registrada. El MTC decidirá cuándo publicarla.`,
        );
        this.enviando.set(false);
        this.volver();
      },
      error: () => this.enviando.set(false),
    });
  }

  volver(): void {
    this.router.navigateByUrl('/admin/estaciones');
  }
}
