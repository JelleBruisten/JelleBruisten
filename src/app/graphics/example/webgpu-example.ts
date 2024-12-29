/// <reference types="@webgpu/types" />

import { ExampleOptions } from "./options";



export async function webGPU_Example(options: ExampleOptions) {
  if(!options.navigator?.gpu) {
    return null;
  }

  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.error('need a browser that supports WebGPU');
    return null;
  }


  const context = options.canvas.getContext('webgpu');
  if(!context) {
    return null;
  }

  options.canvas.width = options.width ?? 300;
  options.canvas.height = options.height ?? 300;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const module = device.createShaderModule({
    label: 'Basic shader',
    code: `
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( -1.0,  -1.0), 
          vec2f(-1.0, 1.0),  
          vec2f( 1.0, -1.0), 

          vec2f( 1.0,  1.0), 
          vec2f(1.0, -1.0),  
          vec2f( -1.0, 1.0) 
        );
 
        return vec4f(pos[vertexIndex], 0.0, 1.0);
      }
 
      struct Uniforms {
          iResolution: vec2f, // Screen resolution
          iTime: f32,         // Time
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      @fragment
      fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
          // Normalized pixel coordinates (from 0 to 1)
          let uv = fragCoord.xy / uniforms.iResolution;

          // Time varying pixel color
          let col = 0.5 + 0.5 * cos(uniforms.iTime + uv.xyx + vec3f(0.0, 2.0, 4.0));

          // Output to screen
          return vec4f(col, 1.0);
      }
    `,
  });

  // Uniform setup
  const uniforms = {
    iResolution: [options.width, options.height],
    iTime: 0.0,
  };

  // Create a uniform buffer
  const uniformBuffer = device.createBuffer({
    size: 16, // vec2 (8 bytes) + float (4 bytes) + padding (4 bytes)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create bind group layout and bind group
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    label: 'Basic shader',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      entryPoint: 'vs',
      module,
    },
    fragment: {
      entryPoint: 'fs',
      module,
      targets: [{ format: presentationFormat }],
    },
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        clearValue: [0.5, 0.5, 0.5, 1],
        loadOp: 'clear',
        storeOp: 'store',
        view: context.getCurrentTexture().createView()
      } ,
    ] as Array<GPURenderPassColorAttachment>,
  } as const; 

  // Update uniforms function
const updateUniforms = (time: number) => {
  uniforms.iTime = time / 1000; // Convert time to seconds
  const uniformData = new Float32Array([
    uniforms.iResolution[0],
    uniforms.iResolution[1],
    uniforms.iTime,
    0.0, // Padding for alignment
  ]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData.buffer);
};
  
  // Render loop
  let rafHandle: number;
  let stopped = false;
  const render = (time: number) => {
    updateUniforms(time);

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const encoder = device.createCommandEncoder({ label: 'Render encoder' });
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup); // Bind the uniform group
    pass.draw(6); // Draw the full-screen quad
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    if(!stopped) {
      rafHandle = requestAnimationFrame(render);
    }
  };
  rafHandle =requestAnimationFrame(render);

  return {
    stop: () => {
      if(rafHandle) {
        cancelAnimationFrame(rafHandle)
      }
      stopped = true;
    },
  };
}