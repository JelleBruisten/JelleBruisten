import { DOCUMENT } from "@angular/common";
import { computed, effect, inject, Injectable, linkedSignal, signal } from "@angular/core";

const enum MotionPreference {
  Auto,
  Reduced,
  NoPreference
}

const enum DarkPreference {
  Auto,
  Light,
  Dark
}

interface EffectiveSettings {
  motion: boolean,
  dark: boolean
}

@Injectable({providedIn: 'root'})
export class SettingsService {
  private readonly document = inject(DOCUMENT);

  // motion
  readonly motion = signal<MotionPreference>(MotionPreference.Auto);
  readonly effectiveReducedMotion = computed(() => {
    const motion = this.motion();
    switch(motion) {
      case MotionPreference.Reduced:
        return true;
      case MotionPreference.NoPreference:
        return false;        

      case MotionPreference.Auto:
      default:
        const window = this.document.defaultView;
        const prefersReduced = window?.matchMedia('(prefers-reduced-motion)')?.matches;
        return !!prefersReduced;
    }
  })

  // darkmode
  readonly dark = signal<DarkPreference>(DarkPreference.Auto);
  readonly effectiveDark = computed(() => {
    const dark = this.dark();
    switch(dark) {
      case DarkPreference.Dark:
        return true;
      case DarkPreference.Light:
        return false;        

      case DarkPreference.Auto:
      default:
        const window = this.document.defaultView;
        const prefersDarkMode = window?.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false;
        return prefersDarkMode;
    }  
  });
  readonly darkLevel = linkedSignal<number>(() => {
    return this.effectiveDark() ? 0.0 : 1.0;
  });   

  readonly effectiveSettings = computed(() => {
    return {
      dark: this.darkLevel(),
      motion: this.effectiveReducedMotion()
    } as const
  })

  constructor() {
    const document = inject(DOCUMENT);

    effect(() => {
      document.documentElement.classList.toggle(
        'dark',
        this.effectiveDark()
      )
    });    
  }
}