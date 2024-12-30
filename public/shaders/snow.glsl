#version 300 es
precision mediump float;

out vec4 fragColor;  // Output fragment color
uniform highp vec2 u_resolution;  // Screen resolution
uniform float u_time;       // Time variable for animations

#define _BlizardFactor 0.2

vec2 uv;

float rnd(float x)
{
    return fract(sin(dot(vec2(x + 47.49, 38.2467 / (x + 2.3)), vec2(12.9898, 78.233))) * (43758.5453));
}

float drawCircle(vec2 center, float radius)
{
    return 1.0 - smoothstep(0.0, radius, length(uv - center));
}

void main()
{
    uv = gl_FragCoord.xy / u_resolution.x;
    
    fragColor = vec4(0.808, 0.89, 0.918, 1.0);
    int totalSnowflakes = 200;
    float j;    
    for(int i=0; i< totalSnowflakes; i++)
    {
        j = float(i);
        float speed = 0.3+rnd(cos(j))*(0.7+0.5*cos(j/(float(totalSnowflakes)*0.25)));
        vec2 center = vec2((0.25-uv.y)*_BlizardFactor+rnd(j)+0.1*cos(u_time+sin(j)), mod(sin(j)-speed*(u_time*1.5*(0.1+_BlizardFactor)), 0.65));
        fragColor += vec4(0.09*drawCircle(center, 0.001+speed*0.012));
    }
}
