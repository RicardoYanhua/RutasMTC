import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Interruptor booleano del sistema. Es un `<button role="switch">` real, no un
 * checkbox maquillado: se enfoca con teclado, anuncia `aria-checked` y se
 * activa con Espacio/Enter sin JavaScript extra.
 */
@Component({
  selector: 'app-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="switch"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="alternar()"
    >
      <span class="switch__track" aria-hidden="true">
        <span class="switch__thumb"></span>
      </span>
      <span class="switch__label">
        {{ label() }}
        @if (hint()) {
          <small>{{ hint() }}</small>
        }
      </span>
    </button>
  `,
  styles: [':host { display: inline-flex; } .switch { width: 100%; }'],
})
export class SwitchComponent {
  readonly checked = input(false);
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly disabled = input(false);
  readonly checkedChange = output<boolean>();

  alternar(): void {
    if (this.disabled()) return;
    this.checkedChange.emit(!this.checked());
  }
}
