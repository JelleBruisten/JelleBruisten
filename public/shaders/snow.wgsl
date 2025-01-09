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

fn rnd(x: f32) -> f32 {
    return fract(sin(dot(vec2<f32>(x + 47.49, 38.2467 / (x + 2.3)), vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn drawCircle(center: vec2<f32>, radius: f32, uv: vec2<f32>) -> f32 {
   return 1.0 - smoothstep(0.0, radius, length(uv - center));
}

fn modf(x: f32, y: f32) -> f32 {
    return x - y * floor(x / y);
}

@fragment
fn fs(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
    let _BlizardFactor: f32 = 0.2;
    var uv = fragCoord.xy / uniforms.iResolution.x; // Normalize fragCoord.xy to UV space

    var fragColor = vec4<f32>(0.808, 0.89, 0.918, 1.0);
    let totalSnowflakes = 200;
    var j: f32;

    for (var i: i32 = 0; i < totalSnowflakes; i++) {
        j = f32(i);
        let speed = 0.3 + rnd(cos(j)) * (0.7 + 0.5 * cos(j / (f32(totalSnowflakes) * 0.25)));
        let center = vec2<f32>(
            (0.25 - uv.y) * _BlizardFactor + rnd(j) + 0.1 * cos(uniforms.iTime + sin(j)),
            modf(sin(j) + speed * (uniforms.iTime * 1.5 * (0.1 + _BlizardFactor)), 0.65)
        );
        let radius = 0.00001 + speed * 0.012;
        fragColor += vec4<f32>(0.09 * drawCircle(center, radius, uv));
    }

    return fragColor;
}