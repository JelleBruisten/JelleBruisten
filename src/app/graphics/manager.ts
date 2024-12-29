import { inject, Injectable } from "@angular/core";
import { GraphicsRuntime } from "./runtime";
import { RenderStrategy, RenderStrategyType } from "./types";
import { DOCUMENT } from "@angular/common";
import { fromEvent } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class BackgroundProgramManager {

  private readonly document = inject(DOCUMENT);
  private readonly runtime = inject(GraphicsRuntime);
  private currentProgram: null | {
    canvas: HTMLCanvasElement;
    stop: () => void;
  } = null

  async createBackgroundProgram(name = 'example', renderStrategy?: RenderStrategy) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    const programConfig = {
      ... renderStrategy,
      name: name
    };

    const program = this.resolveProgram(programConfig);
    return program;
  }

  async resolveProgram(programConfig: {
    name: string;
    type: RenderStrategyType;
    offscreenRendering: boolean;
  }) {
    switch(programConfig.name) {
      case 'example':
        return await import('./example/example').then(async (x) => {
          const handles = await x.start(programConfig, this.document)
          return handles;
        })
    }

    return null
  }
}