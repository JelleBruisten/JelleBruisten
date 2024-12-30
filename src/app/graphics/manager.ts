import { inject, Injectable, isDevMode } from "@angular/core";
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

  async createBackgroundProgram(name = 'snow', renderStrategy?: RenderStrategy) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    // renderStrategy = {
    //   offscreenRendering: false,
    //   type: RenderStrategyType.WebGL
    // }

    const program = this.startProgram(name, renderStrategy, this.document);
    return program;
  }

  async startProgram(name: string, renderStrategy: RenderStrategy, document: Document) {
    // create a new canvas and apply current window size
    const canvas = document.createElement('canvas');
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    // program handles/worker references
    let programHandles: RenderProgramHandles | null = null;
    let worker: Worker | undefined;

    // start program either offscreen or normally
    if(renderStrategy.offscreenRendering) {
       [programHandles, worker] = await this.startProgramOffscreen(name, canvas, renderStrategy)      
    } else {    
      programHandles = await this.startProgramNormally(name, canvas, renderStrategy);
    }

    // construct a information object, with the current strategy, canvas, cleanup methods, handles for interacting with the graphics backend
    const program = {
      strategy: renderStrategy,
      programHandle: programHandles,
      canvas: canvas,
      destroy() {
        // stop program, remove canvas and terminate the worker if there is any
        programHandles?.resume;
        canvas?.remove();

        // cleanup worker
        worker?.terminate();
        worker = undefined;
      }
    } as const;

    // in dev mode print render info
    isDevMode() && printRenderInfo(program)
  
    // return program
    return program;
  }

  async startProgramOffscreen(shaderName: string,canvas: HTMLCanvasElement, renderStrategy: RenderStrategy) {
    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL('./driver/driver.worker', import.meta.url));
    worker.postMessage({ 
      canvas: offscreen, 
      strategy: renderStrategy,
      width: document.defaultView?.innerWidth ?? 300,
      height: document.defaultView?.innerHeight ?? 300,
      shaderName: shaderName,
      type: 'init' 
    }, [offscreen]);

    const programHandles: RenderProgramHandles = {
      resume: () => {
        worker?.postMessage({ type: 'stop'})
      },
      pause: () => {
        worker?.postMessage({ type: 'start' })
      },
      resize: (width: number, height: number) => {
        worker?.postMessage({ type: 'resize', width: width, height: height})
      }
    }

    return [programHandles, worker] as const;
  }

  async startProgramNormally(shaderName: string, canvas: HTMLCanvasElement, renderStrategy: RenderStrategy) {
    let programHandles: RenderProgramHandles | null = null;
    const options = {
      canvas: canvas,
      navigator: navigator,
      height: document.defaultView?.innerHeight ?? 300,
      width: document.defaultView?.innerWidth ?? 300,      
    } as const

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

    return programHandles;
  }
}