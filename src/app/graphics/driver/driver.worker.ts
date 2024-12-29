/// <reference lib="webworker" />
import { every } from "rxjs";
import { type RenderProgramHandles, type RenderProgramOptions, type RenderStrategy, RenderStrategyType } from "../types";


let programHandles: RenderProgramHandles | null = null;
interface ExampleInit {
  canvas: OffscreenCanvas;
  strategy: RenderStrategy,
  height: number;
  width: number;
  name: string
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

  const shaderName = evt.name;

  switch(renderStrategy.type) {
    case RenderStrategyType.WebGL: {
      const shaderSource = await fetch(`/shaders/${shaderName}.glsl`).then((x) => x.text());
      programHandles = await import('./webgl.driver').then(async (x) => x.webGL2Driver({
        ...options,
        shaderSource: shaderSource
      }));
    }
    break;
    case RenderStrategyType.WebGPU: {
      const shaderSource = await fetch(`/shaders/${shaderName}.wgsl`).then((x) => x.text());
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
      init(evt.data);
    break;
    case 'stop':
      programHandles?.stop();
    break;
    case 'start':
      programHandles?.start();
    break;
    case 'resize':
    	programHandles?.resize(evt.data.width, evt.data.height)
    break;
  }
};
