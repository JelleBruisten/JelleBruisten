import { AfterViewInit, ChangeDetectionStrategy, Component, effect, signal, viewChild } from '@angular/core';
import { BackgroundComponent } from "./graphics/background.component";
import { RenderStrategy, RenderStrategyType } from './graphics/types';

@Component({
  imports: [
    BackgroundComponent
],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  background = viewChild(BackgroundComponent);
  strategy = signal<RenderStrategy | null>(null);
  name = signal<'example' | 'snow' | 'dots'>('dots');

  constructor() {
    effect(() => {
      const background = this.background();
      const name = this.name();
      const strategy = this.strategy();

      if(background) {
        background.start(name, strategy);
      }
    })
  }

  toggleRendering() {
    const strategy = this.strategy();
    if(!strategy) {
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

  toggleWebworker() {
    const strategy = this.strategy();
    if(!strategy) {
      return;
    }

    this.strategy.set({
      ... strategy,
      offscreenRendering: !strategy.offscreenRendering
    });
  }


}
