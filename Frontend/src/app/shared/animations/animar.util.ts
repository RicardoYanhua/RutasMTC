/**
 * Animaciones del sistema, sin librería.
 *
 * Todo lo que hacía GSAP aquí lo cubre la plataforma:
 *   · las transiciones puntuales -> Web Animations API (`Element.animate`)
 *   · lo que se dispara al entrar en pantalla -> IntersectionObserver
 *   · lo ligado al scroll -> animaciones CSS con `animation-timeline` (ver
 *     `landing.component.css`), que corren en el compositor sin JS
 *
 * Dos decisiones que conviene no deshacer:
 *
 * 1. Se animan las propiedades independientes `translate`, `scale` y `opacity`,
 *    NO `transform`. `transform` es una sola propiedad: al animarla se pisa
 *    cualquier transformación que el CSS ya tuviera puesta (el `scale(1.2)` de
 *    un marcador activo, por ejemplo) y al terminar da un salto. `translate` y
 *    `scale` componen con `transform` en vez de sustituirlo.
 *
 * 2. `fill: 'backwards'` en las entradas escalonadas: sin él, un elemento con
 *    200 ms de retardo se ve a opacidad 1 hasta que le toca y luego parpadea.
 *
 * Nada de `window.addEventListener('scroll')`: obliga a trabajo de layout en
 * cada frame y es justo lo que estas dos APIs evitan.
 */

/** Lo que devuelven las utilidades que dejan algo escuchando y hay que soltar. */
export interface Animacion {
  kill(): void;
}

export type AnimateTarget = Element | NodeListOf<Element> | Element[] | string;

/** Curva de salida del sistema, la misma que usan las transiciones CSS. */
const SALIDA = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Rebote corto para las confirmaciones. */
const REBOTE = 'cubic-bezier(0.34, 1.6, 0.64, 1)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resolve(target: AnimateTarget, host?: ParentNode): Element[] {
  if (typeof target === 'string') return Array.from((host ?? document).querySelectorAll(target));
  if (target instanceof Element) return [target];
  return Array.from(target as ArrayLike<Element>);
}

export interface FadeOpts {
  y?: number;
  delay?: number;
  duration?: number;
  ease?: string;
  stagger?: number;
  host?: ParentNode;
}

/**
 * Entrada básica: el elemento sube y aparece.
 *
 * Con movimiento reducido no se anima nada y se devuelve sin tocar el DOM: el
 * contenido ya está en su sitio, que es exactamente lo que debe pasar.
 */
export function fadeUp(target: AnimateTarget, opts: FadeOpts = {}): void {
  const els = resolve(target, opts.host);
  if (!els.length || prefersReducedMotion()) return;

  const y = opts.y ?? 18;
  const duration = (opts.duration ?? 0.6) * 1000;
  const base = (opts.delay ?? 0) * 1000;
  const stagger = (opts.stagger ?? 0) * 1000;

  els.forEach((el, i) => {
    el.animate(
      { opacity: [0, 1], translate: [`0 ${y}px`, '0 0'] },
      { duration, delay: base + i * stagger, easing: opts.ease ?? SALIDA, fill: 'backwards' },
    );
  });
}

export function staggerIn(target: AnimateTarget, opts: FadeOpts = {}): void {
  fadeUp(target, { ...opts, stagger: opts.stagger ?? 0.07 });
}

/** Transición entre pasos del planificador: el paso entrante aparece desde abajo. */
export function transicionPaso(entrante: AnimateTarget, host?: ParentNode): void {
  fadeUp(entrante, { y: 16, duration: 0.45, host });
}

/**
 * Revelado al entrar en viewport, en cascada.
 *
 * Motivo de la animación: jerarquía. Cada bloque se presenta cuando toca
 * leerlo, en vez de aparecer todo de golpe.
 *
 * Un único IntersectionObserver vigila los grupos `[data-reveal-group]` y
 * anima sus hijos `.reveal` la primera vez que entran. Los elementos se ocultan
 * por estilo en línea ANTES de observar y se descubren al animarlos: si se
 * dejara al navegador, se verían un instante antes de empezar.
 */
export function revealOnScroll(scope: ParentNode, selector = '.reveal', opts: FadeOpts = {}): Animacion[] {
  const grupos = Array.from(scope.querySelectorAll<HTMLElement>('[data-reveal-group]'));
  const objetivos = grupos.length ? grupos : Array.from(scope.querySelectorAll<HTMLElement>(selector));
  if (!objetivos.length) return [];

  // Sin IntersectionObserver (o con movimiento reducido) el contenido se queda
  // visible tal cual. Nunca se oculta algo que no se vaya a poder revelar.
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return [];

  const hijosDe = (grupo: HTMLElement): HTMLElement[] => {
    const hijos = grupos.length ? Array.from(grupo.querySelectorAll<HTMLElement>(selector)) : [];
    return hijos.length ? hijos : [grupo];
  };

  for (const grupo of objetivos) {
    for (const hijo of hijosDe(grupo)) hijo.style.opacity = '0';
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const grupo = entrada.target as HTMLElement;
        observador.unobserve(grupo);

        hijosDe(grupo).forEach((hijo, i) => {
          hijo.style.opacity = '';
          hijo.animate(
            { opacity: [0, 1], translate: [`0 ${opts.y ?? 26}px`, '0 0'] },
            {
              duration: (opts.duration ?? 0.7) * 1000,
              delay: i * (opts.stagger ?? 0.08) * 1000,
              easing: SALIDA,
              fill: 'backwards',
            },
          );
        });
      }
    },
    // El bloque se revela cuando ya ha entrado de verdad en pantalla, no al
    // asomar el primer píxel por el borde inferior.
    { rootMargin: '0px 0px -18% 0px', threshold: 0 },
  );

  for (const grupo of objetivos) observador.observe(grupo);
  return [{ kill: () => observador.disconnect() }];
}

/**
 * Cuenta hasta el valor final cuando el elemento entra en pantalla.
 * Motivo: storytelling. La cifra "se construye" y por eso se lee.
 */
export function countUp(
  el: HTMLElement,
  valor: number,
  opts: { duration?: number; sufijo?: string } = {},
): Animacion | null {
  const sufijo = opts.sufijo ?? '';
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    el.textContent = `${valor}${sufijo}`;
    return null;
  }

  el.textContent = `0${sufijo}`;
  let raf = 0;

  const contar = (): void => {
    const duracion = (opts.duration ?? 1.1) * 1000;
    const inicio = performance.now();
    const paso = (ahora: number): void => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      // Misma sensación que `power2.out`: arranca rápido y frena al final.
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(valor * eased)}${sufijo}`;
      if (t < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  };

  const observador = new IntersectionObserver(
    (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      observador.disconnect();
      contar();
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  );
  observador.observe(el);

  return {
    kill: () => {
      observador.disconnect();
      cancelAnimationFrame(raf);
    },
  };
}

/**
 * Coloca el pulgar del segmented control bajo la opción activa.
 *
 * Motivo: transición de estado. El fondo viaja de una opción a otra en vez de
 * parpadear, así que se ve de dónde vino la selección.
 *
 * El desplazamiento lo anima la transición CSS de `.seg__thumb`; aquí solo se
 * escriben las medidas. En la primera colocación se suprime la transición: si
 * no, el pulgar entraría deslizándose desde la esquina izquierda.
 */
export function moverThumbSeg(contenedor: HTMLElement, activo: HTMLElement | null): void {
  const thumb = contenedor.querySelector<HTMLElement>('.seg__thumb');
  if (!thumb || !activo) return;

  const x = activo.offsetLeft - 4;
  const w = activo.offsetWidth;
  const primeraVez = !thumb.style.width;

  if (primeraVez || prefersReducedMotion()) {
    thumb.style.transition = 'none';
    thumb.style.transform = `translateX(${x}px)`;
    thumb.style.width = `${w}px`;
    // Lectura forzada para que el navegador aplique lo anterior antes de
    // devolver la transición; sin esto el salto se anima igualmente.
    void thumb.offsetWidth;
    thumb.style.transition = '';
    return;
  }

  thumb.style.transform = `translateX(${x}px)`;
  thumb.style.width = `${w}px`;
}

/** Rebote corto al confirmar una selección. Motivo: feedback táctil. */
export function pulso(el: Element | null): void {
  if (!el || prefersReducedMotion()) return;
  el.animate({ scale: [0.96, 1] }, { duration: 400, easing: REBOTE });
}
