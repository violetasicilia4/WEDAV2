// Pantalla de cuenta (/crear/cuenta). Es una simulación del frontend: no hay cuentas, clave ni sesión reales.
// Estas reglas deciden qué pasa con el evento que ya está guardado en este navegador al «registrarse» o «ingresar».
import type { AppState } from './types';

/** Hay un evento guardado en este navegador: terminado, o empezado (al menos un nombre cargado en el onboarding). */
export const hasEvent = (s: AppState): boolean => s.onboarded || s.couple.first.trim() !== '' || s.couple.second.trim() !== '';

/** Adónde sigue la persona después de registrarse o ingresar: si ya terminó el onboarding, al panel; si no, al onboarding (que conserva lo cargado). */
export const accountDestination = (s: AppState): '/panel' | '/crear' => (s.onboarded ? '/panel' : '/crear');
