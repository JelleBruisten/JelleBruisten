/// <reference lib="webworker" />
import { type RenderProgramHandles, type RenderStrategy, RenderStrategyType } from "../types";


let programHandles: RenderProgramHandles | null = null;
interface ExampleInit {
  canvas: OffscreenCanvas;
  strategy: RenderStrategy,
  height: number;
  width: number;
  shaderName: string
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

const init = async (evt: ExampleInit) => {
  const canvas = evt.canvas as OffscreenCanvas;
  const renderStrategy = evt.strategy as RenderStrategy;

  const options = {
    canvas: canvas,
    navigator: navigator,
    height: evt.height,
    width: evt.width,
  } as const

  const shaderName = evt.shaderName;

  switch(renderStrategy.type) {
    case RenderStrategyType.WebGL: {
      const shaderSource = await resolveShader(`${shaderName}.glsl`);
      programHandles = await import('./webgl.driver').then(async (x) => x.webGL2Driver({
        ...options,
        shaderSource: shaderSource
      }));
    }
    break;
    case RenderStrategyType.WebGPU: {
      const shaderSource = await resolveShader(`${shaderName}.wgsl`);
      programHandles = await import('./webgpu.driver').then(async (x) => x.webGPUDriver({
        ...options,
        shaderSource: shaderSource
      }));
    }
    break;
  }
}

onmessage = async(evt) => {
  switch(evt.data.type) {
    case 'init':
      programHandles?.stop();
      programHandles = null;
      init(evt.data);      
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
  }
};
