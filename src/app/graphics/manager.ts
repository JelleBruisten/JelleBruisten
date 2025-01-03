import { inject, Injectable, isDevMode } from "@angular/core";
import { GraphicsRuntime } from "./runtime";
import { RenderProgramHandles, RenderProgramOptions, RenderStrategy, RenderStrategyType } from "./types";
import { DOCUMENT } from "@angular/common";
import { printRenderInfo } from "./driver/debug";

export interface ProgramRef { 
  readonly name: string; 
  readonly strategy: RenderStrategy; 
  readonly programHandle: RenderProgramHandles | null; 
  readonly canvas: HTMLCanvasElement; 
  readonly destroy: () => void; 
}

@Injectable({
  providedIn: 'root',
})
export class BackgroundProgramManager {

  private readonly document = inject(DOCUMENT);
  private readonly runtime = inject(GraphicsRuntime);

  // lazy properties
  private shaderCache: Map<string, string> | undefined;
  private worker: Worker | undefined;
  private currentProgram: ProgramRef | null = null;

  async startProgram(name = 'dots', renderStrategy?: RenderStrategy | null) {
    if(!renderStrategy) {
      renderStrategy = this.runtime.getRecommendedRenderStrategy();
    }

    const program = await this.startProgramHelper(name, renderStrategy, this.document);
    return program;
  }

  private async startProgramHelper(name: string, renderStrategy: RenderStrategy, document: Document) {
    if(this.currentProgram && this.currentProgram.name === name && this.currentProgram.strategy.offscreenRendering === renderStrategy.offscreenRendering && this.currentProgram.strategy.type == renderStrategy.type) {
      console.warn(`Tried to start program with same name, offscreenRendering and driver`);
      return;
    }

    // create a new canvas and apply current window size
    const canvas = document.createElement('canvas');
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    canvas.style.pointerEvents = 'auto'

    // program handles/worker references
    let programHandles: RenderProgramHandles | null = null;    

    // start program either offscreen or normally
    if(renderStrategy.offscreenRendering) {
      programHandles = await this.startProgramOffscreen(name, canvas, renderStrategy)      
    } else {    
      programHandles = await this.startProgramNormally(name, canvas, renderStrategy);
    }

    // construct a information object, with the current strategy, canvas, cleanup methods, handles for interacting with the graphics backend
    const cleanupController = this.addListeners(canvas, programHandles);
    const program: ProgramRef = {
      name: name,
      strategy: renderStrategy,
      programHandle: programHandles,
      canvas: canvas,
      destroy: () => {
        // stop program, remove canvas and terminate the worker if there is any
        programHandles?.stop();
        canvas?.remove();
        cleanupController?.abort();        
      }
    };

    // in dev mode print render info
    isDevMode() && printRenderInfo(program);

    this.currentProgram = program;
    
    // return program
    return program;
  }

  private async startProgramOffscreen(shaderName: string,canvas: HTMLCanvasElement, renderStrategy: RenderStrategy) {
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
      mousemove: (x: number, y: number) => {
        worker?.postMessage({ type: 'mousemove', mouseX: x, mouseY: y});
      }
    }

    return programHandles;
  }

  private getWorker() {
    this.worker ??= new Worker(new URL('./driver/driver.worker', import.meta.url));
    return this.worker;
  }

  private async startProgramNormally(shaderName: string, canvas: HTMLCanvasElement, renderStrategy: RenderStrategy) {
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

  public addListeners(canvas: HTMLCanvasElement, handles: RenderProgramHandles | null) {    
    if(!handles || !canvas) {      
      return;
    }
    
    const controller = new AbortController();

    // add mouse movement
    canvas.addEventListener('mousemove', (event) => {

      // correct mouse position based on boundingRect
      const rect = canvas.getBoundingClientRect();

      const mouseX = ((event.clientX) - rect.left);
      const mouseY = 1 - ((event.clientY) - rect.top);  // Normalize Y coordinate
    
      handles.mousemove(mouseX, mouseY)
    }, { 
      // passive: true, 
      signal: controller.signal 
    });

    // canvas.addEventListener('click', (event) => {
    //   console.log(event);
    //   //handles.mousemove(event.x, event.y)
    // }, { 
    //   // passive: true, 
    //   signal: controller.signal 
    // });

    return controller;
  }
  
}