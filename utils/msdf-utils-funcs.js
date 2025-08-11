export const parseAtlasInfo = (atlasInfo) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(atlasInfo, 'application/xml');
    const common = xml.querySelector('common');
    const scaleW = parseInt(common.getAttribute('scaleW'));
    const scaleH = parseInt(common.getAttribute('scaleH'));

    const symbols = {};
    xml.querySelectorAll("char").forEach(char => {
        const id = parseInt(char.getAttribute('id'));
        symbols[id] = {
            x: parseInt(char.getAttribute("x")) / scaleW,
            y: parseInt(char.getAttribute("y")) / scaleH,
            w: parseInt(char.getAttribute("width")),
            h: parseInt(char.getAttribute("height")),
            xoffset: parseInt(char.getAttribute("xoffset")),
            yoffset: parseInt(char.getAttribute("yoffset")),
            xadvance: parseInt(char.getAttribute("xadvance"))
        };
    });

    return { symbols, scaleW, scaleH, lineHeight: parseInt(common.getAttribute("lineHeight")) };
}

export const prepareText = (text, parsedFNTObject, startX, startY) => {
    let tempCursorStartX = startX;
    let tempCursorStartY = startY;
    const symbolsIds = [];
    const preparedSymbols = [];
    for (let i = 0; i < text.length; ++i) {
        symbolsIds.push(text.charCodeAt(i));
    }

    for (let i = 0; i < symbolsIds.length; i++) {
        const symbolToAdd = { ...parsedFNTObject.symbols[symbolsIds[i]] };
        if (symbolsIds[i] === 10) symbolToAdd.lineBreak = true;
        preparedSymbols.push(symbolToAdd);
    }
    preparedSymbols.forEach(symbol => {
        symbol.u0 = symbol.x;
        symbol.v0 = symbol.y;
        symbol.u1 = symbol.x + symbol.w / parsedFNTObject.scaleW;
        symbol.v1 = symbol.y + symbol.h / parsedFNTObject.scaleH;
        symbol.x = tempCursorStartX + symbol.xoffset;
        symbol.y = tempCursorStartY + symbol.yoffset;
        if (symbol.lineBreak) {
            tempCursorStartX = startX;
            tempCursorStartY += parsedFNTObject.lineHeight;
        }
        else {
            tempCursorStartX += symbol.xadvance;
        }
        delete symbol.xadvance;
        delete symbol.xoffset;
        delete symbol.yoffset;
    });
    return preparedSymbols;
}

export const renderSymbol = (gl, symbol, scaleW, scaleH, posBuff, uvBuff, indexBuff, positionLoc, texCoordLoc, scale = 1) => {
    const qx0 = symbol.x * scale; // я вирішив так назвати змінну бо quad x position і тд
    const qy0 = symbol.y * scale;
    const qx1 = qx0 + symbol.w * scale;
    const qy1 = qy0 + symbol.h * scale;

    const positions = new Float32Array([
        qx0, qy0,
        qx1, qy0,
        qx0, qy1,
        qx1, qy1
    ]);

    const uvs = new Float32Array([
        symbol.u0, symbol.v0,
        symbol.u1, symbol.v0,
        symbol.u0, symbol.v1,
        symbol.u1, symbol.v1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuff);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuff);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
}
