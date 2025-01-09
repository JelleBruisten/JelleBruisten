#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_darkmode;
out vec4 fragColor;

// Pseudo-random function
float random(float seed) {
    return fract(sin(seed) * 43758.545446523);
}

float roundedBoxSDF(vec2 p, vec2 size, float radius) {
    return length(max(abs(p) - size + radius, 0.0)) - radius;
}

float layer(vec2 uv, float iTime, int numShapes, float speed, float sizeFactor, float radiusFactor, float verticalSpacing) {
    float col = 0.0;

    for (int i = 0; i < numShapes; i++) {
        // seed
        float randValue = random(float(i)); // Seed the random function with column index

        // component A and B, we gonna use these for getting the iteration number and xPos
        float modA = (iTime * speed + float(i) * verticalSpacing + randValue);
        float modB = (1.0 + verticalSpacing);

        // iteration and xPos
        float iteration = floor(modA / modB);        
        float xPos = mix(-0.8, 0.8, random(iteration)); // Map random value to screen width

        // Compute vertical position with continuous looping
        float timeOffset = mod(modA, modB);
        float yPos = -0.5 + timeOffset;

        // Compute visibility factor based on vertical position (fade in and out)
        float visibility = smoothstep(-0.5, -0.4, yPos) * smoothstep(0.5, 0.4, yPos);

        // Radius increases with height
        float radius = radiusFactor * (0.05 + yPos * 0.1);

        // Size of the rounded box
        vec2 size = vec2(0.1, 0.1) * sizeFactor;

        // Transform uv to center relative position
        vec2 p = uv - vec2(xPos, yPos);

        // Compute the distance using roundedBoxSDF
        float d = roundedBoxSDF(p, size, radius);

        // Accumulate the layer's contribution, modulated by visibility
        col += visibility * (1.0 - smoothstep(0.0, 0.005, d));
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalized UV coordinates
    vec2 uv = fragCoord / u_resolution.xy; // <0, 1>
    uv -= 0.5;                           // <-0.5, 0.5>
    uv.x *= u_resolution.x / u_resolution.y; // Fix aspect ratio

    // Initialize color
    float col = 0.0;

    // Layer parameters
    float numLayers = 3.;
    float opacity = 0.3;

    // Accumulate contributions from each layer
    for (float i = 0.; i < numLayers; i = i + 1.0) {
        float speed = 0.2 / (i + 1.0);
        float size = 0.8 / (i + 1.0);  
        float radius = 0.8 / (i + 1.0);
        float spacing = 3.0 / (i + 1.0);       
        int numShapes = int(floor((numLayers - i) * 2.));
        col += (layer(uv, u_time + 150.123, numShapes, speed, size, radius, spacing) * opacity);
    }

    // Output final color
        
    fragColor = vec4(
        // replace this with a color or make it white vec3(1.0)
        vec3(0.435,0.569,0.886) 
        //vec3(1.0) 

        // apply the color 
        * (1.0 - col), 1.0
    );
}

void main() {
  mainImage(fragColor, gl_FragCoord.xy);
}