import { RenderProgramHandles, RenderStrategy, RenderStrategyType } from "../types";
import { ExampleOptions } from "./options";

export async function start(renderStrategy: RenderStrategy, document: Document) {

  const canvas = document.createElement('canvas');
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  let programHandles: RenderProgramHandles | null = null;

  if(renderStrategy.offscreenRendering) {
    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL('./example.worker', import.meta.url));
    worker.postMessage({ 
      canvas: offscreen, 
      strategy: renderStrategy,
      width: document.defaultView?.innerWidth ?? 300,
      height: document.defaultView?.innerHeight ?? 300,
      type: 'init' 
    }, [offscreen]);

    programHandles = {
      stop: () => {
        worker.postMessage({ type: 'stop'})
      },
      start: () => {
        worker.postMessage({ type: 'start' })
      },
      resize: (width: number, height: number) => {
        worker.postMessage({ type: 'resize', width: width, height: height})
      }
    }
    
    // do it in a webworker
  } else {    
    const options: ExampleOptions = {
      canvas: canvas,
      navigator: navigator,
      height: document.defaultView?.innerHeight ?? 300,
      width: document.defaultView?.innerWidth ?? 300
    }

    switch(renderStrategy.type) {
      case RenderStrategyType.WebGL:
        programHandles = await import('./webgl-example').then(async (x) => await x.webGL2_Example(options));
      break;
      case RenderStrategyType.WebGPU:
        if(!document.defaultView?.navigator) {
          throw Error('webGPU requires access to navigator');
        }
        programHandles = await import('./webgpu-example').then(async (x) => await x.webGPU_Example(options));
      break;
      default:
        // write or make a image?
    }
  }

  return {
    strategy: renderStrategy,
    programHandle: programHandles,
    canvas: canvas
  };
}