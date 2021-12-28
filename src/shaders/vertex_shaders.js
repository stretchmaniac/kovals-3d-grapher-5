const raycast_vert = 
`#version 300 es
// four corners of the pixel
out vec3 vRayOrigin00;
out vec3 vRayOrigin10;
out vec3 vRayOrigin01;
out vec2 pixPos;

in vec4 aVertexPosition;

uniform mat4 uRayTransform;
uniform vec2 uScreenSize;

void main(){
    float px = 2.0 / uScreenSize.x;
    float py = 2.0 / uScreenSize.y;
    float aspect = uScreenSize.y / uScreenSize.x;
    vec4 newVertPos = aVertexPosition;
    newVertPos.y *= aspect;
    vRayOrigin00 = (uRayTransform * (newVertPos + vec4(-px/2.0, -py/2.0, 0.0, 0.0))).xyz;
    vRayOrigin10 = (uRayTransform * (newVertPos + vec4(px/2.0, -py/2.0, 0.0, 0.0))).xyz;
    vRayOrigin01 = (uRayTransform * (newVertPos + vec4(-px/2.0, py/2.0, 0.0, 0.0))).xyz;
    gl_Position = aVertexPosition;

    pixPos = aVertexPosition.xy;
}
`;

// pass through vertex shader
const passthrough_vert = 
`#version 300 es
in vec4 aVertexPosition;

void main(){
    gl_Position = aVertexPosition;
}
`

const passthrough_with_pix_vert = 
`#version 300 es
in vec4 aVertexPosition;

out vec2 pixPos;

void main(){
    gl_Position = aVertexPosition;
    pixPos = aVertexPosition.xy;
}
`;