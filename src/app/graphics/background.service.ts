import { computed, effect, inject, Injectable, linkedSignal, signal } from "@angular/core";
import { RenderStrategy, RenderStrategyType } from "./types";
import { Subject } from "rxjs";

const availableBackgrounds = [
  'example', 'snow', 'dots', 'shapes'
] as const;

type BackgroundName = typeof availableBackgrounds[number];

interface BackgroundEvent {
  type: 'pause' | 'resume' | 'stop',
  data?: unknown | unknown[]
}

@Injectable({ providedIn: 'root'})
export class BackgroundService {
  readonly strategy = signal<RenderStrategy | null>(null);
  readonly name = signal<BackgroundName>('shapes');
  readonly availableBackgrounds = [... availableBackgrounds];
  readonly events$ = new Subject<BackgroundEvent>();

  toggleRendering(type?: RenderStrategyType) {
    const strategy = this.strategy();
    if(!strategy ) {
      return;
    }

    if(typeof type === 'number') {
      this.strategy.set({
        ... strategy,
        type: type
      });
      return;
    }

    if(strategy.type === RenderStrategyType.WebGL) {
      this.strategy.set({
        ... strategy,
        type: RenderStrategyType.WebGPU
      });
    } else {
      this.strategy.set({
        ... strategy,
        type: RenderStrategyType.WebGL
      });
    }
  }

  toggleWebworker(offscreenRendering?: boolean) {
    const strategy = this.strategy();
    if(!strategy) {
      return;
    }

    if(typeof offscreenRendering === 'boolean') {
      this.strategy.set({
        ... strategy,
        offscreenRendering: offscreenRendering
      });
      return;
    }

    // else toggle
    this.strategy.set({
      ... strategy,
      offscreenRendering: !strategy.offscreenRendering
    });
  }

  pause() {
    this.events$.next({
      type: 'pause'
    })
  }

  resume() {
    this.events$.next({
      type: 'resume'
    })
  }

  stop() {
    this.events$.next({
      type: 'stop'
    })
  }
}