import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Set de iconos propio del proyecto: una sola familia, 24x24, trazo 2, remates
 * redondeados. Se mantiene hecho a mano (en vez de tirar de una librería) porque
 * ya está cableado en todas las plantillas y el rediseño no quiere churn en 15
 * componentes; a cambio, la coherencia de la familia se cuida aquí en un único
 * sitio: mismo viewBox, mismo grosor, misma retícula.
 */
export type IconName =
  | 'arrow-right'
  | 'arrow-up-right'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'menu'
  | 'check'
  | 'check-circle'
  | 'plus'
  | 'refresh'
  | 'download'
  | 'edit'
  | 'trash'
  | 'lock'
  | 'logout'
  | 'user'
  | 'warning'
  | 'info'
  | 'sun'
  | 'cloud-rain'
  | 'droplet'
  | 'wind'
  | 'uv'
  | 'train'
  | 'walk'
  | 'pin'
  | 'flag'
  | 'route'
  | 'compass'
  | 'layers'
  | 'search'
  | 'sliders'
  | 'calendar'
  | 'clock'
  | 'ticket'
  | 'leaf'
  | 'book'
  | 'mountain'
  | 'landmark'
  | 'utensils'
  | 'eye'
  | 'eye-off'
  | 'image'
  | 'file-text'
  | 'zoom-in'
  | 'zoom-out'
  | 'crosshair'
  | 'logo';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('arrow-right') {
          <path d="M5 12h13M13 6l6 6-6 6" />
        }
        @case ('arrow-up-right') {
          <path d="M7 17 17 7M8 7h9v9" />
        }
        @case ('chevron-left') {
          <polyline points="15,6 9,12 15,18" />
        }
        @case ('chevron-right') {
          <polyline points="9,6 15,12 9,18" />
        }
        @case ('chevron-down') {
          <polyline points="6,9 12,15 18,9" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h10" />
        }
        @case ('check') {
          <polyline points="5,13 10,18 19,7" />
        }
        @case ('check-circle') {
          <circle cx="12" cy="12" r="9" />
          <polyline points="8,12.5 11,15.5 16,9" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('refresh') {
          <path d="M20 11a8 8 0 0 0-14-4M4 13a8 8 0 0 0 14 4M4 4v5h5M20 20v-5h-5" />
        }
        @case ('download') {
          <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        }
        @case ('edit') {
          <path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16.5V20z" />
          <path d="M14.5 6.5 17.5 9.5" />
        }
        @case ('trash') {
          <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13" />
          <path d="M10 11v6M14 11v6" />
        }
        @case ('lock') {
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        }
        @case ('logout') {
          <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
          <path d="M11 12h9M17 8l4 4-4 4" />
        }
        @case ('user') {
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        }
        @case ('warning') {
          <path d="M12 4 2.8 20h18.4L12 4z" />
          <path d="M12 10v4" />
          <circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11.5v5" />
          <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        }
        @case ('cloud-rain') {
          <path d="M7 15.5a3.8 3.8 0 0 1 .6-7.6 5 5 0 0 1 9.4-1.4 4.3 4.3 0 0 1 .4 8.5" />
          <path d="M9 18.5 8 21.5M13 18.5l-1 3M17 18.5l-1 3" />
        }
        @case ('droplet') {
          <path d="M12 3.5c3.5 4 5.5 6.6 5.5 9.2A5.5 5.5 0 0 1 6.5 12.7c0-2.6 2-5.2 5.5-9.2z" />
        }
        @case ('wind') {
          <path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5" />
          <path d="M3 12.5h14a2.5 2.5 0 1 1-2.5 2.5" />
          <path d="M3 17h7" />
        }
        @case ('uv') {
          <circle cx="12" cy="14" r="3.6" />
          <path d="M12 3v2.4M5.6 6.6l1.7 1.7M18.4 6.6l-1.7 1.7M3.5 14H6M18 14h2.5" />
        }
        @case ('train') {
          <rect x="5.5" y="3.5" width="13" height="13" rx="3" />
          <path d="M5.5 10.5h13" />
          <path d="M9.5 20.5 7.5 17M14.5 20.5 16.5 17" />
          <circle cx="9" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
        }
        @case ('walk') {
          <circle cx="13" cy="4.5" r="2" />
          <path d="M13.5 7 11 12.5 8 20" />
          <path d="M13.5 7 17 10l1 4" />
          <path d="M11 12.5 14 17l.5 3.5" />
        }
        @case ('pin') {
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.6" />
        }
        @case ('flag') {
          <path d="M6 21V4" />
          <path d="M6 4.5h11.5l-2.2 4 2.2 4H6" />
        }
        @case ('route') {
          <circle cx="6" cy="18.5" r="2.5" />
          <circle cx="18" cy="5.5" r="2.5" />
          <path d="M15.5 5.5H10a3.5 3.5 0 0 0 0 7h4a3.5 3.5 0 0 1 0 7H8.5" />
        }
        @case ('compass') {
          <circle cx="12" cy="12" r="9" />
          <path d="M15.2 8.8 13.6 13.6 8.8 15.2l1.6-4.8 4.8-1.6z" />
        }
        @case ('layers') {
          <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3z" />
          <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
          <path d="m3.5 17 8.5 4.5 8.5-4.5" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        }
        @case ('sliders') {
          <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
          <circle cx="15" cy="8" r="2" />
          <circle cx="9" cy="16" r="2" />
        }
        @case ('calendar') {
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="8.5" />
          <polyline points="12,7.5 12,12 15,13.8" />
        }
        @case ('ticket') {
          <path d="M3 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 6.5v2a2.5 2.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-2a2.5 2.5 0 0 0 0-7z" />
          <path d="M13.5 5v3M13.5 11v2M13.5 16v3" />
        }
        @case ('leaf') {
          <path d="M4.5 19.5C3 14 6 5.5 19.5 4.5c1 11.5-6.5 15.5-13 13.5" />
          <path d="M8 16c2-4 5-6.5 9-8" />
        }
        @case ('book') {
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
          <path d="M4 18.2A2.5 2.5 0 0 1 6.5 21H19" />
        }
        @case ('mountain') {
          <path d="M2.5 19.5 9 7.5l4.2 7.2" />
          <path d="m11 19.5 4.6-8 5.9 8z" />
        }
        @case ('landmark') {
          <path d="M4 9.5 12 4l8 5.5" />
          <path d="M3 9.5h18M3 20.5h18" />
          <path d="M6.5 12v6M12 12v6M17.5 12v6" />
        }
        @case ('utensils') {
          <path d="M7 3v7.5a2 2 0 0 0 2 2v8.5" />
          <path d="M11 3v7.5a2 2 0 0 1-2 2" />
          <path d="M17 3c-1.4 0-2.5 2-2.5 4.5S15.6 12 17 12v9" />
        }
        @case ('eye') {
          <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('eye-off') {
          <path d="M3 3l18 18" />
          <path d="M10.6 5.7A11.5 11.5 0 0 1 12 5.5C18.2 5.5 22 12 22 12a19 19 0 0 1-3.4 4.3M6.7 6.9A19 19 0 0 0 2 12s3.8 6.5 10 6.5a11 11 0 0 0 4.1-.8" />
          <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="9" cy="9" r="1.9" />
          <path d="M5.2 20.4c2.4-5.4 4.9-8.2 7.4-8.2 2.4 0 5.2 2.6 8.2 7.6" />
        }
        @case ('file-text') {
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        }
        @case ('zoom-in') {
          <circle cx="11" cy="11" r="6.5" />
          <path d="M11 8.5v5M8.5 11h5M16 16l4.5 4.5" />
        }
        @case ('zoom-out') {
          <circle cx="11" cy="11" r="6.5" />
          <path d="M8.5 11h5M16 16l4.5 4.5" />
        }
        @case ('crosshair') {
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5" />
        }
        @case ('logo') {
          <path
            fill="currentColor"
            stroke="none"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M1 21 L8 8 L11 12.5 L16 3 L23 21 Z M17.9 8.5 A1.9 1.9 0 1 0 14.1 8.5 A1.9 1.9 0 1 0 17.9 8.5 Z"
          />
        }
      }
    </svg>
  `,
  host: { style: 'display: inline-flex; line-height: 0;' },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.8);
}
