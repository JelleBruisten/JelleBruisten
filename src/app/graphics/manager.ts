import { inject, Injectable } from "@angular/core";
import { GraphicsRuntime } from "./runtime";
import { RenderProgramHandles, RenderProgramOptions, RenderStrategy, RenderStrategyType } from "./types";
import { DOCUMENT } from "@angular/common";
import { printRenderInfo } from "./driver/debug";

@Injectable({
  providedIn: 'root',
})
export class BackgroundProgramManager {

  private readonly document = inject(DOCUMENT);
  private readonly runtime = inject(GraphicsRuntime);

  async createBackgroundProgram(name = 'example', renderStrategy?: RenderStrategy) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    const program = this.startProgram(name, renderStrategy, this.document);
    return program;
  }

  async startProgram(name: string, renderStrategy: RenderStrategy, document: Document) {
    const canvas = document.createElement('canvas');
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    let programHandles: RenderProgramHandles | null = null;
    let worker: Worker | undefined;

    if(renderStrategy.offscreenRendering) {
      const offscreen = canvas.transferControlToOffscreen();
      worker = new Worker(new URL('./driver/driver.worker', import.meta.url));
      worker.postMessage({ 
        canvas: offscreen, 
        strategy: renderStrategy,
        width: document.defaultView?.innerWidth ?? 300,
        height: document.defaultView?.innerHeight ?? 300,
        name: name,
        type: 'init' 
      }, [offscreen]);
  
      programHandles = {
        stop: () => {
          worker?.postMessage({ type: 'stop'})
        },
        start: () => {
          worker?.postMessage({ type: 'start' })
        },
        resize: (width: number, height: number) => {
          worker?.postMessage({ type: 'resize', width: width, height: height})
        }
      }
      
      // do it in a webworker
    } else {    
      const options = {
        canvas: canvas,
        navigator: navigator,
        height: document.defaultView?.innerHeight ?? 300,
        width: document.defaultView?.innerWidth ?? 300,      
      } as const
  
      const shaderName = name;
      switch(renderStrategy.type) {
        case RenderStrategyType.WebGL: {
          const shaderSource = await fetch(`./shaders/${shaderName}.glsl`).then((x) => x.text());
          programHandles = await import('./driver/webgl.driver').then(async (x) => x.webGL2Driver({
            ...options,
            shaderSource: shaderSource
          }));
        }
        break;
        case RenderStrategyType.WebGPU: {
          const shaderSource = await fetch(`./shaders/${shaderName}.wgsl`).then((x) => x.text());
          programHandles = await import('./driver/webgpu.driver').then(async (x) => x.webGPUDriver({
            ...options,
            shaderSource: shaderSource
          }));
        }
        break;
      }
    }


    const program = {
      strategy: renderStrategy,
      programHandle: programHandles,
      canvas: canvas,
      destroy() {
        // stop program, remove canvas and terminate the worker if there is any
        programHandles?.stop;
        canvas?.remove();

        // cleanup worker
        worker?.terminate();
        worker = undefined;
      }
    } as const;

    printRenderInfo(program)
  
    return program;
  }
}