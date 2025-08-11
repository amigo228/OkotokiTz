export const calculatePositions = (x, y, a, mode = 'up') => {
    const h = (Math.sqrt(3) / 2) * a;
    const sign = mode === 'up' ? -1 : 1;

    return [
        x, y + sign * (2 / 3) * h,
        x - a / 2, y - sign * (1 / 3) * h,
        x + a / 2, y - sign * (1 / 3) * h
    ];
}

export const defineColor = (prevValue, currentValue) => {
    return currentValue > prevValue ? 1 : 0;
}

export const defineNextPosition = (prevValue) => {
    const {prevX, prevY, tokenPrice, tempBTCValue} = prevValue;
    if (tempBTCValue === null) {
        return [prevX + 0.001, prevY];
    }
    const priceDiff = Number(tokenPrice) - Number(tempBTCValue);
    const scale = 10;
    const maxShift = 0.15;

    let shift = priceDiff * scale;
    if (shift > maxShift) shift = maxShift;
    else if (shift < -maxShift) shift = -maxShift;

    const targetY = prevY + shift;
    const smoothingFactor = 0.3;
    const y = prevY + (targetY - prevY) * smoothingFactor;

    const x = prevX + 0.005;
    return [x, y];
}

export const movePositionsLeft = (positions, shiftX) => {
    for (let i = 0; i < positions.length; i += 2) {
        positions[i] -= shiftX;
    }
}

export const movePositionsUpDown = (positions, shiftY) => {
    for (let i = 0; i < positions.length; i += 2) {
        positions[i + 1] -= shiftY;
    }
};

export const clampChartY = (positions) => {
    const ys = positions.filter((_, i) => i % 2 === 1);
    const maxY = Math.max(...ys);
    const minY = Math.min(...ys);

    const upperLimit = 0;
    const lowerLimit = -0.95;
    const smoothing = 0.1;
    let shift = 0;

    if (maxY > upperLimit) {
        shift = (maxY - upperLimit) * smoothing;
    }
    else if (minY < lowerLimit) {
        shift = (minY - lowerLimit) * smoothing;
    }

    if (shift !== 0) {
        movePositionsUpDown(positions, shift);
    }
    for (let i = 1; i < positions.length; i += 2) {
        if (positions[i] > upperLimit) positions[i] = upperLimit;
        if (positions[i] < lowerLimit) positions[i] = lowerLimit;
    }
};
