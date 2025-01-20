#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

vec3 hash33(vec3 p)
{
    p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
              dot(p,vec3(269.5,183.3,246.1)),
              dot(p,vec3(113.5,271.9,124.6)));

    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float tetraNoise(vec2 o) // Perlin(ish) Noise Function adapted from Stefan Gustavson's 'Simplex Noise Demystified' (Math)
{
    vec3 p = vec3(o.x + 0.008*u_time, o.y + 0.004*u_time,0.005*u_time);
    vec3 i = floor(p + dot(p, vec3(0.33333,0.33333,0.33333)));
    p -= i - dot(i, vec3(0.16666,0.16666,0.16666));
    
    vec3 i1 = step(p.yzx, p);
    vec3 i2 = max(i1, 1.0-i1.zxy);
    i1 = min(i1, 1.0-i1.zxy);
    vec3 p1 = p - i1 + 0.16666, 
         p2 = p - i2 + 0.33333, 
         p3 = p - 0.5;
    vec4 v = max(0.5 - vec4(dot(p,p), dot(p1,p1), dot(p2,p2), dot(p3,p3)), 0.0);
    vec4 d = vec4(dot(p, hash33(i)), dot(p1, hash33(i + i1)), dot(p2, hash33(i + i2)), dot(p3, hash33(i + 1.0)));
    float n = clamp(dot(d,v*v*v*8.)*1.732 + 0.5, 0., 1.);
    return n;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) //Meta-structure adapted from Shane - https://www.shadertoy.com/view/ldscWH (Thank you!)
{
    vec2 p =  (fragCoord.xy*2.5 - u_resolution.xy) / 
              (u_resolution.y/2.0 + u_resolution.x/2.0);// Convert Coords
    float f = sin(32.*tetraNoise(p));
    float weight =  clamp( 1.5-.5*abs(f)/fwidth(f),0.,1.);

    vec3 c1 = vec3(0.8);
    vec3 c2 = vec3(1.0);
    fragColor = abs(
      mix(
                              vec4(c1 * u_darkmode, 1),
                              vec4(c2 * u_darkmode, 1),
                              weight
                          )
    );

    fragColor.xyz = fragColor.xyz;
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}