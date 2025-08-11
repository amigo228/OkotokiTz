import {initWebGLWithFonts} from "./init.js";
import {prepareText, renderSymbol} from "./utils/msdf-utils-funcs.js";
import {getTokenPrice} from "./utils/api.js";
import {
    createProgram,
    createShader,
    fragmentShaderTriangleSource,
    vertexShaderTriangleSource,
    normalizePositions
} from "./utils/webgl-utils-funcs.js";
import {
    calculatePositions,
    clampChartY,
    defineColor,
    defineNextPosition,
    movePositionsLeft
} from "./utils/utils-funcs.js";

(async () => {
    const canvas = document.getElementById('c');
    const context = await initWebGLWithFonts(canvas, [
        { key: 'regular', imageSrc: 'fonts/font-regular.png', fntSrc: 'fonts/NS-regular.fnt' },
        { key: 'bold',    imageSrc: 'fonts/font-bold.png',    fntSrc: 'fonts/NS-bold.fnt' }
    ]);

    const { gl } = context;
    let tempBTCValue = null;
    let positions = [-0.99, -0.5];
    setInterval(async () => {
        const tokenPrice = await getTokenPrice("BTC");
        const difference = defineColor(tempBTCValue, tokenPrice);
        const [newX, newY] = defineNextPosition({
            prevX: positions[positions.length - 2],
            prevY: positions[positions.length - 1],
            tokenPrice,
            tempBTCValue
        });
        positions.push(newX, newY);
        if (newX > 0.99) {
            movePositionsLeft(positions, 0.01);
        }
        clampChartY(positions);
        gl.clear(gl.COLOR_BUFFER_BIT);
        renderTriangle(gl, 155, 87, difference ? [0, 1, 0, 1] : [0, 0, 0, 1], 25, 'up');
        renderTriangle(gl, 155, 107, difference ? [0, 0, 0, 1]: [1, 0, 0, 1], 25, 'down');
        render2DChart(gl, positions);
        renderText(
            context,
            (s => s.length > 3 ? s.slice(0, 3) + ',' + s.slice(3) : s)(tokenPrice.toString()),
            120,
            30,
            [0, 0, 0, 1],
            1.5,
            'bold'
        );
        renderText(context, "BTC / USDT •", 350, 40, [0,0,0,1], 0.6, 'bold');
        renderText(context, "Binance", 620, 40, [0,0,0,1], 0.6, 'regular');
        renderText(context, "1.00% • 1,140.87", 250, 150, [0.215, 0.015, 0.909, 1], 0.8, 'bold');
        tempBTCValue = Number(tokenPrice);
        }, 300)
})();

export function renderText(context, text, x, y, color = [0,0,0,1], scale = 1, fontKey = 'regular') {
    const { gl, buffers, fonts } = context;
    const font = fonts[fontKey] || Object.values(fonts)[0];
    gl.useProgram(context.program);
    const positionLoc = gl.getAttribLocation(context.program, 'a_position');
    const texCoordinatesLoc = gl.getAttribLocation(context.program, 'a_texCoord');
    const colorLoc = gl.getUniformLocation(context.program, 'u_color');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, font.texture);
    gl.uniform4f(colorLoc, ...color);
    const prepared = prepareText(text, font.parsedFNT, x, y);

    prepared.filter(s => !s.lineBreak).forEach(symbol => {
        renderSymbol(
            gl,
            symbol,
            font.parsedFNT.scaleW,
            font.parsedFNT.scaleH,
            buffers.positionBuffer,
            buffers.uvBuffer,
            buffers.indexBuffer,
            positionLoc,
            texCoordinatesLoc,
            scale
        );
    });
}

let triangleProgramCache = null; // пізно зрозумів що тиак можна зробити, все переписувати вже пізно
let chartProgramCache = null;
export function renderTriangle(gl, x, y, color = [0, 0, 0, 1], side_size, mode) {
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const attrib1Enabled = gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
    if (!triangleProgramCache) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderTriangleSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderTriangleSource);
        triangleProgramCache = createProgram(gl, vertexShader, fragmentShader);
    }

    gl.useProgram(triangleProgramCache);
    gl.disableVertexAttribArray(1);
    const triangleColorLocation = gl.getUniformLocation(triangleProgramCache, "u_color");
    gl.uniform4f(triangleColorLocation, ...color);
    const positions = normalizePositions(
        calculatePositions(x, y, side_size, mode),
        gl.canvas.width,
        gl.canvas.height
    );
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const positionAttribLoc = gl.getAttribLocation(triangleProgramCache, "a_position");
    gl.enableVertexAttribArray(positionAttribLoc);
    gl.vertexAttribPointer(positionAttribLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindBuffer(gl.ARRAY_BUFFER, prevArrayBuffer);
    gl.bindTexture(gl.TEXTURE_2D, prevTexture);

    if (attrib1Enabled) {
        gl.enableVertexAttribArray(1);
    } else {
        gl.disableVertexAttribArray(1);
    }

    gl.useProgram(prevProgram);
    gl.deleteBuffer(positionBuffer);
}

export const render2DChart = (gl, positions) => {
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const attrib1Enabled = gl.getVertexAttrib(1, gl.VERTEX_ATTRIB_ARRAY_ENABLED);

    if (!chartProgramCache) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderTriangleSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderTriangleSource);
        chartProgramCache = createProgram(gl, vertexShader, fragmentShader);
    }

    gl.useProgram(chartProgramCache);
    gl.disableVertexAttribArray(1);

    const colorLocation = gl.getUniformLocation(chartProgramCache, "u_color");
    gl.uniform4f(colorLocation, 0.184, 0.003, 0.992, 1);

    const positionAttributeLocation = gl.getAttribLocation(chartProgramCache, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const offset = 0.004;
    function offsetPositions(posArray, deltaY) {
        return posArray.map((v, i) => (i % 2 === 1 ? v + deltaY : v));
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsetPositions(positions, offset)), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(offsetPositions(positions, -offset)), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINE_STRIP, 0, positions.length / 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, prevArrayBuffer);
    gl.bindTexture(gl.TEXTURE_2D, prevTexture);
    if (attrib1Enabled) {
        gl.enableVertexAttribArray(1);
    } else {
        gl.disableVertexAttribArray(1);
    }
    gl.useProgram(prevProgram);
    gl.deleteBuffer(positionBuffer);
};




