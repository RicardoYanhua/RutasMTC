import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-region no-imprimir" aria-live="polite">
      @for (toast of notificaciones.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.tipo" role="status">
          <span class="toast__icon" aria-hidden="true">
            <app-icon [name]="iconoDe(toast.tipo)" [size]="14" [strokeWidth]="2.2" />
          </span>
          <span class="toast__msg">{{ toast.mensaje }}</span>
          <button type="button" class="toast__close" (click)="notificaciones.cerrar(toast.id)" aria-label="Cerrar notificación">
            <app-icon name="close" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast {
        animation: toast-in 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .toast {
          animation: none;
        }
      }
    `,
  ],
})
export class ToastsComponent {
  readonly notificaciones = inject(NotificationService);

  iconoDe(tipo: string): IconName {
    if (tipo === 'exito') return 'check';
    if (tipo === 'error') return 'warning';
    return 'info';
  }
}
