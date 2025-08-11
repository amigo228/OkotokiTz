export const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source)
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    if (!success) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

export const createProgram = (gl, vertexShader, fragmentShader)  => {
   const program = gl.createProgram();
   gl.attachShader(program, vertexShader);
   gl.attachShader(program, fragmentShader);
   gl.linkProgram(program);
   const success = gl.getProgramParameter(program, gl.LINK_STATUS);
   if (success) return program;
   console.log(gl.getProgramInfoLog(program));
   gl.deleteProgram(program);
}

export const vertexShaderFontSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    uniform vec2 u_resolution;
    varying vec2 v_texCoord;
    
    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

export const fragmentShaderFontSource = `
#extension GL_OES_standard_derivatives : enable
precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec4 u_color;

float median3(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    vec3 msdf = texture2D(u_texture, v_texCoord).rgb;
    float sd = median3(msdf.r, msdf.g, msdf.b);
    float pxDist = fwidth(sd); 
    float alpha = smoothstep(0.5 - pxDist, 0.5 + pxDist, sd);
    gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
}
`;

export const vertexShaderTriangleSource = `
    attribute vec2 a_position;
    
    void main() {
        gl_Position = vec4(a_position, 0, 1);
    }
`;

export const fragmentShaderTriangleSource = `
    precision mediump float;
    uniform vec4 u_color;
    
    void main() {
        gl_FragColor = u_color;
    }
`;

export function normalizePositions(positions, canvasWidth, canvasHeight) {
    return positions.map((v, i) => {
        if (i % 2 === 0) { // x
            return (v / canvasWidth) * 2 - 1;
        } else {          // y
            return 1 - (v / canvasHeight) * 2;
        }
    });
}

