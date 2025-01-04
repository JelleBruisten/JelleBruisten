/// <reference lib="webworker" />
import { type RenderProgramHandles, type RenderStrategy, RenderStrategyType } from "../types";


let programHandles: RenderProgramHandles | null = null;
interface BackgroundOptions {
  canvas: OffscreenCanvas;
  strategy: RenderStrategy,
  height: number;
  width: number;
  shaderName: string;
  settings: Record<string, boolean>;
}

const shaderCache = new Map<string, string>();

const resolveShader = async(shaderName: string) => {
  let shaderSource: string | null | undefined = null;

  // lazy create map
  if(shaderCache && shaderCache.has(shaderName)) {
    shaderSource = shaderCache.get(shaderName);

    if(shaderSource) {
      return shaderSource
    }
  }

  shaderSource = await fetch(`./shaders/${shaderName}`).then((x) => x.text());
  if(shaderSource) {
    // set the shaderName
    shaderCache.set(shaderName, shaderSource);
  }
  return shaderSource as string;
}

const init = async (evt: BackgroundOptions) => {
  const canvas = evt.canvas as OffscreenCanvas;
  const renderStrategy = evt.strategy as RenderStrategy;

  const options = {
    canvas: canvas,
    navigator: navigator,
    height: evt.height,
    width: evt.width,
    settings: evt.settings
  } as const

  const shaderName = evt.shaderName;

  switch(renderStrategy.type) {
    case RenderStrategyType.WebGL: {
      const shaderSource = await resolveShader(`${shaderName}.glsl`);
      return await import('./webgl.driver').then(async (x) => x.webGL2Driver({
        ...options,
        shaderSource: shaderSource
      }));
    }
    case RenderStrategyType.WebGPU: {
      const shaderSource = await resolveShader(`${shaderName}.wgsl`);
      return await import('./webgpu.driver').then(async (x) => x.webGPUDriver({
        ...options,
        shaderSource: shaderSource
      }));
    }
  }
}


onmessage = async(evt) => {
  switch(evt.data.type) {
    case 'init':      
      programHandles?.stop();
      programHandles = await init(evt.data);          
    break;
    case 'stop':
      programHandles?.stop();
    break;
    case 'resume':
      programHandles?.resume();      
    break;
    case 'pause':
      programHandles?.pause();
    break;
    case 'resize':
    	programHandles?.resize(evt.data.width, evt.data.height)
    break;
    case 'mousemove':
    	programHandles?.mousemove(evt.data.mouseX, evt.data.mouseY)
    break;    
    case 'darkmode':
      programHandles?.darkmode(evt.data.dark)
    break;    
  }
};
