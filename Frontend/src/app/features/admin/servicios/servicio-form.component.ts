import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServicioService } from '../../../core/services/servicio.service';
import { EstacionService } from '../../../core/services/estacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Estacion } from '../../../core/models/estacion.model';
import { SERVICIOS_SUGERIDOS } from '../../../core/models/servicio.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';

function retornoDespuesDeSalida(grupo: AbstractControl): ValidationErrors | null {
  const salida = grupo.get('horaSalida')?.value;
  const retorno = grupo.get('horaRetorno')?.value;
  if (!salida || !retorno) return null;
  return retorno > salida ? null : { retornoInvalido: true };
}

/** Origen y destino iguales dejarían un tramo sin recorrido. */
function origenDistintoDeDestino(grupo: AbstractControl): ValidationErrors | null {
  const origen = grupo.get('estacionOrigenId')?.value;
  const destino = grupo.get('estacionDestinoId')?.value;
  if (!origen || !destino) return null;
  return origen === destino ? { mismoTramo: true } : null;
}

/** Pantalla de alta y edición de un servicio ferroviario. */
@Component({
  selector: 'app-admin-servicio-form',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './servicio-form.component.html',
  styleUrls: ['../admin-shared.css'],
})
export class ServicioFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicioService = inject(ServicioService);
  private readonly estacionService = inject(EstacionService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly serviciosSugeridos = SERVICIOS_SUGERIDOS;
  readonly estaciones = signal<Estacion[]>([]);
  readonly editandoId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly enviando = signal(false);

  readonly esEdicion = computed(() => this.editandoId() !== null);
  readonly titulo = computed(() => (this.esEdicion() ? 'Editar servicio' : 'Nuevo servicio'));

  readonly form = this.fb.nonNullable.group(
    {
      estacionOrigenId: [null as number | null, [Validators.required]],
      estacionDestinoId: [null as number | null, [Validators.required]],
      nombreServicio: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      horaSalida: ['', [Validators.required]],
      horaRetorno: ['', [Validators.required]],
      minutosTransito: [null as number | null, [Validators.required, Validators.min(1), Validators.max(600)]],
      precio: [null as number | null, [Validators.required, Validators.min(0)]],
    },
    { validators: [retornoDespuesDeSalida, origenDistintoDeDestino] },
  );

  ngOnInit(): void {
    this.estacionService.listar().subscribe((estaciones) => this.estaciones.set(estaciones));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    const id = Number(idParam);
    this.editandoId.set(id);
    this.cargando.set(true);
    // La API no expone /servicios/:id, así que el registro se localiza en el
    // listado, que de todos modos es corto.
    this.servicioService.listar().subscribe({
      next: (servicios) => {
        const servicio = servicios.find((s) => s.est_id_servicio === id);
        if (!servicio) {
          this.notificaciones.error('No se encontró el servicio solicitado.');
          this.volver();
          return;
        }
        this.form.setValue({
          estacionOrigenId: servicio.est_id_estacion_origen,
          estacionDestinoId: servicio.est_id_estacion_destino,
          nombreServicio: servicio.est_nombre_servicio,
          horaSalida: servicio.est_hora_salida.slice(0, 5),
          horaRetorno: servicio.est_hora_retorno.slice(0, 5),
          minutosTransito: servicio.est_minutos_transito,
          precio: servicio.est_precio,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.notificaciones.error('No se pudo cargar el servicio.');
        this.volver();
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificaciones.error('Revisa los campos marcados antes de guardar.');
      return;
    }
    this.enviando.set(true);
    const valores = this.form.getRawValue();
    const id = this.editandoId();
    const operacion = id ? this.servicioService.actualizar(id, valores) : this.servicioService.crear(valores);
    operacion.subscribe({
      next: () => {
        this.notificaciones.exito(id ? 'Servicio actualizado.' : 'Servicio registrado.');
        this.enviando.set(false);
        this.volver();
      },
      error: () => this.enviando.set(false),
    });
  }

  volver(): void {
    this.router.navigateByUrl('/admin/servicios');
  }
}
