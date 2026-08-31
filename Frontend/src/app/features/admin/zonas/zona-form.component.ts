import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ZonaService } from '../../../core/services/zona.service';
import { EstacionService } from '../../../core/services/estacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Estacion } from '../../../core/models/estacion.model';
import { ZonaForm } from '../../../core/models/zona.model';
import { CATEGORIAS, DIFICULTADES } from '../../../core/models/preferencias.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';

/** Formatos que acepta el endpoint de subida (ver upload.middleware.js). */
const FORMATOS = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Pantalla de alta y edición de una zona turística.
 *
 * Vive en su propia ruta (`/admin/zonas/nueva`, `/admin/zonas/:id/editar`) en
 * lugar de desplegarse sobre la tabla: son diez campos más una imagen, y a esa
 * escala un panel embutido desplaza el listado y hace perder el contexto.
 *
 * La imagen se sube en cuanto se elige el archivo y lo que se guarda en la base
 * de datos es solo su ruta (`/uploads/<archivo>`). Como la landing y el
 * planificador leen ese mismo campo, la foto aparece allí en cuanto se guarda.
 */
@Component({
  selector: 'app-admin-zona-form',
  imports: [ReactiveFormsModule, IconComponent, ImageSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zona-form.component.html',
  styleUrls: ['../admin-shared.css'],
})
export class ZonaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly zonaService = inject(ZonaService);
  private readonly estacionService = inject(EstacionService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categorias = CATEGORIAS;
  readonly dificultades = DIFICULTADES;
  readonly formatos = FORMATOS;

  readonly estaciones = signal<Estacion[]>([]);
  readonly editandoId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly subiendo = signal(false);
  readonly errorImagen = signal<string | null>(null);
  readonly imagenUrl = signal<string | null>(null);

  readonly esEdicion = computed(() => this.editandoId() !== null);
  readonly titulo = computed(() => (this.esEdicion() ? 'Editar zona turística' : 'Nueva zona turística'));

  readonly form = this.fb.nonNullable.group({
    estacionId: [null as number | null, [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    categoria: [null as (typeof CATEGORIAS)[number] | null, [Validators.required]],
    distanciaKm: [null as number | null, [Validators.required, Validators.min(0.1), Validators.max(20)]],
    minutosIdaVuelta: [null as number | null, [Validators.required, Validators.min(5), Validators.max(480)]],
    dificultad: [null as (typeof DIFICULTADES)[number] | null, [Validators.required]],
    horarioAtencion: ['', [Validators.maxLength(100)]],
    ingreso: ['', [Validators.maxLength(60)]],
    descripcion: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.estacionService.listar().subscribe((estaciones) => this.estaciones.set(estaciones));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.editandoId.set(id);
    this.cargando.set(true);
    this.zonaService.obtener(id).subscribe({
      next: (zona) => {
        this.form.setValue({
          estacionId: zona.zon_id_estacion,
          nombre: zona.zon_nombre,
          categoria: zona.zon_categoria,
          distanciaKm: zona.zon_distancia_km,
          minutosIdaVuelta: zona.zon_minutos_ida_vuelta,
          dificultad: zona.zon_dificultad,
          horarioAtencion: zona.zon_horario_atencion ?? '',
          ingreso: zona.zon_ingreso ?? '',
          descripcion: zona.zon_descripcion ?? '',
        });
        this.imagenUrl.set(zona.zon_imagen_url);
        this.cargando.set(false);
      },
      error: () => {
        this.notificaciones.error('No se encontró la zona solicitada.');
        this.volver();
      },
    });
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
    this.zonaService.subirImagen(archivo).subscribe({
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
   * al guardar, cuando ya sabe que la zona se quedó sin foto.
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
    const valores: ZonaForm = { ...this.form.getRawValue(), imagenUrl: this.imagenUrl() };
    const id = this.editandoId();
    const operacion = id ? this.zonaService.actualizar(id, valores) : this.zonaService.crear(valores);

    operacion.subscribe({
      next: () => {
        this.notificaciones.exito(id ? 'Zona turística actualizada.' : 'Zona turística registrada.');
        this.enviando.set(false);
        this.volver();
      },
      error: () => this.enviando.set(false),
    });
  }

  volver(): void {
    this.router.navigateByUrl('/admin/zonas');
  }
}
