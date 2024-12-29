export const enum RenderStrategyType {
  WebGL,
  WebGPU,
  Image
}

export interface RenderStrategy {
  readonly type: RenderStrategyType,
  readonly offscreenRendering: boolean;
}

export interface RenderProgramHandles {
  start(): void;
  stop(): void; 
  resize(width: number, height: number): void;
}

export interface RenderProgramOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas, 
  navigator: Navigator,
  width: number;
  height: number;

  // contains a webgpu shader or fragment shader in the case of webGL
  shaderSource: string
}