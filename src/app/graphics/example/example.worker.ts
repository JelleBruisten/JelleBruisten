/// <reference lib="webworker" />
import { RenderStrategy, RenderStrategyType } from "../types";
import { ExampleOptions } from "./options";


let programHandles: {
  stop: () => void
} | null;
interface ExampleInit {
  canvas: OffscreenCanvas;
  strategy: RenderStrategy,
  height: number;
  width: number
}
const init = async (evt: ExampleInit) => {
  const canvas = evt.canvas as OffscreenCanvas;
  const renderStrategy = evt.strategy as RenderStrategy;


  const options: ExampleOptions = {
    canvas: canvas,
    navigator: navigator,
    height: evt.height,
    width: evt.width
  }

  switch(renderStrategy.type) {
    case RenderStrategyType.WebGL:
      programHandles = await import('./webgl-example').then(async (x) => x.webGL2_Example(options));
    break;
    case RenderStrategyType.WebGPU:
      programHandles = await import('./webgpu-example').then(async (x) => x.webGPU_Example(options));
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
  }
};
