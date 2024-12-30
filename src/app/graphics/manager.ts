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

  // lazy properties
  private shaderCache: Map<string, string> | undefined;
  private worker: Worker | undefined;

  async startProgram(name = 'snow', renderStrategy?: RenderStrategy) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    // renderStrategy = {
    //   offscreenRendering: true,
    //   type: RenderStrategyType.WebGPU
    // }

    const program = this.startProgramHelper(name, renderStrategy, this.document);
    return program;
  }

  async startProgramHelper(name: string, renderStrategy: RenderStrategy, document: Document) {
    // create a new canvas and apply current window size
    const canvas = document.createElement('canvas');
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    // program handles/worker references
    let programHandles: RenderProgramHandles | null = null;

    // start program either offscreen or normally
    if(renderStrategy.offscreenRendering) {
      programHandles = await this.startProgramOffscreen(name, canvas, renderStrategy)      
    } else {    
      programHandles = await this.startProgramNormally(name, canvas, renderStrategy);
    }

    // construct a information object, with the current strategy, canvas, cleanup methods, handles for interacting with the graphics backend
    const program = {
      strategy: renderStrategy,
      programHandle: programHandles,
      canvas: canvas,
      destroy: () => {
        // stop program, remove canvas and terminate the worker if there is any
        programHandles?.resume;
        canvas?.remove();

        // cleanup worker
        this.worker?.terminate();
        this.worker = undefined;
      }
    } as const;

    // in dev mode print render info
    isDevMode() && printRenderInfo(program)
  
    // return program
    return program;
  }

  async startProgramOffscreen(shaderName: string,canvas: HTMLCanvasElement, renderStrategy: RenderStrategy) {
    // worker 
    const worker = this.getWorker();

    // setup program
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ 
      canvas: offscreen, 
      strategy: renderStrategy,
      width: document.defaultView?.innerWidth ?? 300,
      height: document.defaultView?.innerHeight ?? 300,
      shaderName: shaderName,
      type: 'init' 
    }, [offscreen]);

    // setup worker
    const programHandles: RenderProgramHandles = {
      stop: () => {
        worker?.postMessage({ type: 'stop'})
      },
      resume: () => {
        worker?.postMessage({ type: 'resume'})
      },
      pause: () => {
        worker?.postMessage({ type: 'pause' })
      },
      resize: (width: number, height: number) => {
        worker?.postMessage({ type: 'resize', width: width, height: height})
      },
    }

    return programHandles;
  }

  private getWorker() {
    this.worker ??= new Worker(new URL('./driver/driver.worker', import.meta.url));
    return this.worker;
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
        const shaderSource = await this.resolveShader(`${shaderName}.glsl`);
        programHandles = await import('./driver/webgl.driver').then(async (x) => x.webGL2Driver({
          ...options,
          shaderSource: shaderSource
        }));
      }
      break;
      case RenderStrategyType.WebGPU: {
        const shaderSource = await this.resolveShader(`${shaderName}.wgsl`);
        programHandles = await import('./driver/webgpu.driver').then(async (x) => x.webGPUDriver({
          ...options,
          shaderSource: shaderSource
        }));
      }
      break;
    }

    return programHandles;
  }

  private async resolveShader(shaderName: string) {
    let shaderSource: string | null | undefined = null;

    // lazy create map
    if(this.shaderCache && this.shaderCache.has(shaderName)) {
      shaderSource = this.shaderCache.get(shaderName);

      if(shaderSource) {
        return shaderSource
      }
    }

    shaderSource = await fetch(`./shaders/${shaderName}`).then((x) => x.text());
    if(shaderSource) {

      // lazily create the cache if it does not exist
      this.shaderCache ??= new Map<string, string>();

      // set the shaderName
      this.shaderCache.set(shaderName, shaderSource);
    }
    return shaderSource as string;
  }
}