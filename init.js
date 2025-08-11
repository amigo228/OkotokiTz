import {parseAtlasInfo} from "./utils/msdf-utils-funcs.js";
import {createProgram, createShader, fragmentShaderFontSource, vertexShaderFontSource} from './utils/webgl-utils-funcs.js';

async function loadFont(gl, imageSrc, fntSrc) {
    const texture = gl.createTexture();
    await new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            resolve();
        };
        img.onerror = reject;
    });

    const fntText = await fetch(fntSrc).then(r => r.text());
    const parsedFNT = parseAtlasInfo(fntText);

    return { texture, parsedFNT };
}

export async function initWebGLWithFonts(canvas, fonts) {
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL not supported");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.9529, 0.9529, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.getExtension("OES_standard_derivatives");

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderFontSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderFontSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const texCoordinatesLoc = gl.getAttribLocation(program, 'a_texCoord');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const textureLoc = gl.getUniformLocation(program, 'u_texture');
    const colorLoc = gl.getUniformLocation(program, 'u_color');

    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 2,1,3]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLoc);
    gl.enableVertexAttribArray(texCoordinatesLoc);
    gl.uniform1i(textureLoc, 0);

    const fontsMap = {};
    for (const f of fonts) {
        fontsMap[f.key] = await loadFont(gl, f.imageSrc, f.fntSrc);
    }

    return {
        gl,
        program,
        buffers: {
            positionBuffer,
            uvBuffer,
            indexBuffer,
        },
        locations: {
            positionLoc,
            texCoordinatesLoc,
            resolutionLoc,
            textureLoc,
            colorLoc,
        },
        fonts: fontsMap,
        canvasSize: {width: canvas.width, height: canvas.height},
    };
}