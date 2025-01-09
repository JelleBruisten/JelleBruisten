import { RenderProgramHandles, RenderProgramOptions } from "../types";

// Compile a shader
function compileShader(gl: WebGL2RenderingContext , source: string, type: GLenum) {
  const shader = gl.createShader(type);
  if(!shader) {
    return null;
  }
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      throw new Error('Failed to compile shader');
  }
  return shader;
}

// Create a program
function createProgram(gl: WebGL2RenderingContext , vertexSource: string, fragmentSource: string) {
  const program = gl.createProgram();
  if(!program) {
    throw new Error('Failed to create a program');
  }

  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  if(!vertexShader || !fragmentShader) {
    throw new Error('Failed to compile shaders');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      throw new Error('Failed to link program');
  }
  return [
    program,
    () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader)
    }
  ] as const;
}
const darkModeColor = 0.2;
const lightModeColor = 1;

export async function webGL2Driver(options: RenderProgramOptions): Promise<RenderProgramHandles | null> {
  const canvas = options.canvas;
  // Create a WebGL context
  const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

  if(!canvas || !gl) {
    throw new Error('Failed get a canvas/webgl rendering context');
  }

  // Resize the canvas to fit the window
  canvas.width = options.width;
  canvas.height = options.height;

    // Vertex data for a full-screen quad
  const vertices = new Float32Array([
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0,
  ]);

  // Create a buffer and upload the vertex data
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Compile and link the shaders
  const vertexSource = `#version 300 es
  in vec2 a_position;

  void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
  }
  `;
  const fragmentSource = options.shaderSource;

  const [program, cleanupProgram] = createProgram(gl, vertexSource, fragmentSource);
  // Look up attribute and uniform locations
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const darkModeLocation = gl.getUniformLocation(program, 'u_darkmode');

  // Enable the position attribute
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  // darkmode
  gl.useProgram(program);
  gl.uniform1f(darkModeLocation, options.settings["dark"] ? darkModeColor : lightModeColor);

  // Render loop
  let rafHandle: number | null = null;

  // control whether we are paused
  let paused = false;
  let stopped = false;

  // time
  let accumulatedTime = 0;
  let lastRenderTime = 0; // Last frame's timestamp
  const render = (timestamp: number) => {
    if (!lastRenderTime) {
      lastRenderTime = timestamp;      
    }

    if (paused || stopped) {
        return; // Skip rendering while paused
    }

    const delta = timestamp - lastRenderTime; // Time since the last frame
    accumulatedTime += delta; // Add delta to accumulated time
    lastRenderTime = timestamp; // Update the last render time

    // Resize the canvas to fit the window
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear the screen
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use the program
    gl.useProgram(program);

    // Set the uniforms    
    gl.uniform1f(timeLocation, accumulatedTime / 1000);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    // Draw the quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }
  rafHandle = requestAnimationFrame(render);

  return {
    pause: () => {
      if (paused) return;

      paused = true;

      // cancel the AnimationFrame
      if (rafHandle) {
          cancelAnimationFrame(rafHandle);
          rafHandle = null;
      }
    },
    resume: () => {
      if (!paused) return;

      paused = false;
      lastRenderTime = performance.now();

      // Restart the render loop
      rafHandle = requestAnimationFrame(render);
    },
    resize: (width, height) => {
      canvas.width = width;
      canvas.height = height;
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    },
    stop: () => {
      stopped = true
      if (rafHandle) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }

      // cleanup program
      cleanupProgram();
    },
    mousemove: (x, y) => {
      gl.uniform2f(mouseLocation, x, y);
    },
    darkmode(dark) {
      gl.useProgram(program);
      gl.uniform1f(darkModeLocation, dark ? darkModeColor : lightModeColor);
    }
  } satisfies RenderProgramHandles;

}
