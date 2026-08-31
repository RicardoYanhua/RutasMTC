import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WizardStateService } from '../services/wizard-state.service';

/** Impide saltarse pasos del asesor: cada paso exige que el anterior esté resuelto. */
export const estacionStepGuard: CanActivateFn = () => {
  const wizard = inject(WizardStateService);
  return wizard.preferenciasCompletas() || inject(Router).parseUrl('/planificar/preferencias');
};

export const alternativasStepGuard: CanActivateFn = () => {
  const wizard = inject(WizardStateService);
  return wizard.estacionSeleccionada() || inject(Router).parseUrl('/planificar/estacion');
};

export const rutaStepGuard: CanActivateFn = () => {
  const wizard = inject(WizardStateService);
  return wizard.zonaSeleccionada() || inject(Router).parseUrl('/planificar/alternativas');
};

export const informeStepGuard: CanActivateFn = (route) => {
  if (route.paramMap.get('codigo')) return true;
  const wizard = inject(WizardStateService);
  return wizard.zonaSeleccionada() || inject(Router).parseUrl('/planificar/alternativas');
};
