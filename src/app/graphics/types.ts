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
