export const enum RenderStrategyType {
  WebGL,
  WebGPU,
  Image
}

export interface RenderStrategy {
  readonly type: RenderStrategyType,
  readonly offscreenRendering: boolean;
}