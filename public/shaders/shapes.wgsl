@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
  let pos = array(
    vec2f( -1.0,  -1.0), 
    vec2f(1.0, -1.0),  
    vec2f( -1.0, 1.0), 

    vec2f( -1.0,  1.0), 
    vec2f(1.0, -1.0),  
    vec2f( 1.0, 1.0) 
  );

  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

// Uniform Structure
struct Uniforms {
    iResolution: vec2f, // Screen resolution
    iTime: f32,         // Time
    iDarkmode: f32,
    iMouse: vec2f       // Mouse position
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;



// Layer function
fn random(seed: f32) -> f32 {
    return fract(sin(seed) * 43758.545446523);
}

fn roundedBoxSDF(p: vec2f, size: vec2f, radius: f32) -> f32 {
    return length(max(abs(p) - size + radius, vec2f(0.0))) - radius;
}

fn modf(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

fn layer(
    uv: vec2f,
    iTime: f32,
    numShapes: i32,
    speed: f32,
    sizeFactor: f32,
    radiusFactor: f32,
    verticalSpacing: f32,
) -> f32 {
    var col: f32 = 0.0;

    for (var i: i32 = 0; i < numShapes; i = i + 1) {
        // seed
        let randValue = random(f32(i));

        // component A and B, we gonna use these for getting the iteration number and xPos
        let modA = (iTime * speed + f32(i) * verticalSpacing + randValue);
        let modB = (1.0 + verticalSpacing);

        // iteration and xPos
        let iteration = floor(modA / modB);
        let xPos = mix(-0.8, 0.8, random(iteration));

        // Compute vertical position with continuous looping
        let timeOffset = modf(modA, modB);
        let yPos = -0.5 + timeOffset;

        let visibility = smoothstep(-0.5, -0.4, yPos) * (1.0 - smoothstep(0.4, 0.5, yPos));

        let radius = radiusFactor * (0.05 + yPos * 0.1);

        let size = vec2f(0.1, 0.1) * sizeFactor;

        // adding p = uv + vec2f(x, y) instead of substracting since coordinates are different in WGSL vs GLSL
        // and flip the xCoordinate to align with how it works in glsl
        let p = uv + vec2f(-xPos, yPos);

        let d = roundedBoxSDF(p, size, radius);

        col = col + visibility * (1.0 - smoothstep(0.0, 0.005, d));
    }

    return col;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    // Normalize pixel coordinates (from 0 to 1)
    var uv = fragCoord.xy / uniforms.iResolution;
    uv = uv - vec2f(0.5);
    uv.x = uv.x * (uniforms.iResolution.x / uniforms.iResolution.y);

    // Initialize color
    var col: f32 = 0.0;

     // Layer parameters
    let numLayers = 3.0;
    let opacity = 0.3;

    // Accumulate contributions from each layer
    for (var i: f32 = 0.0; i < numLayers; i = i + 1.0) {
        let speed = 0.2 / (i + 1.0);
        let size = 0.8 / (i + 1.0);
        let radius = 0.8 / (i + 1.0);
        let spacing = 3.0 / (i + 1.0);
        let numShapes = i32(floor((numLayers - i) * 2.0));
        col = col + (layer(uv, uniforms.iTime + 150.123, numShapes, speed, size, radius, spacing) * opacity);
    }

    // Apply color and return output
    let color = vec3f(0.435, 0.569, 0.886) * (1.0 - col);

    return vec4f(color, 1.0);
}

