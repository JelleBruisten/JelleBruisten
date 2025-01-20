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

fn hash33(p: vec3<f32>) -> vec3<f32> {
    let q = vec3<f32>(
        dot(p, vec3<f32>(127.1, 311.7, 74.7)),
        dot(p, vec3<f32>(269.5, 183.3, 246.1)),
        dot(p, vec3<f32>(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(q) * 43758.5453123);
}

fn tetraNoise(o: vec2<f32>) -> f32 {
    let p = vec3<f32>(o.x + 0.008 * uniforms.iTime, o.y + 0.004 * uniforms.iTime, 0.005 * uniforms.iTime);
    let i = floor(p + dot(p, vec3<f32>(0.33333)));
    let x = p - i + dot(i, vec3<f32>(0.16666));
    let i1 = step(x.yzx, x);
    let i2 = max(i1, 1.0 - i1.zxy);
    let i1_min = min(i1, 1.0 - i1.zxy);

    let p1 = x - i1_min + 0.16666;
    let p2 = x - i2 + 0.33333;
    let p3 = x - 0.5;

    let v = max(
      vec4<f32>(0.5) - vec4<f32>(dot(x, x), dot(p1, p1), dot(p2, p2), dot(p3, p3)), 
      vec4<f32>(0.0)
    );
    let d = vec4<f32>(
        dot(x, hash33(i)),
        dot(p1, hash33(i + i1_min)),
        dot(p2, hash33(i + i2)),
        dot(p3, hash33(i + vec3<f32>(1.0)))
    );

    let n = clamp(dot(d, v * v * v * 8.0) * 1.732 + 0.5, 0.0, 1.0);
    return n;
}

@fragment
fn fs(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
    var p = (fragCoord.xy * 2.5 - uniforms.iResolution.xy) / 
            (uniforms.iResolution.y / 2.0 + uniforms.iResolution.x / 2.0);

    let f = sin(32.0 * tetraNoise(p));
    let weight = clamp(1.5 - 0.5 * abs(f) / fwidth(f), 0.0, 1.0);

    let c1 = vec3<f32>(0.8);
    let c2 = vec3<f32>(1.0);

    let color = mix(
        vec4<f32>(c1 * uniforms.iDarkmode, 1.0),
        vec4<f32>(c2 * uniforms.iDarkmode, 1.0),
        weight
    );

    return vec4<f32>(color);    
}
