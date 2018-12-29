export function lerpVectors(a, b, t) {
    return addVectors(scaleVector(a, t), scaleVector(b, 1 - t))
}

export function scaleVector(vector, scalar) {
    const { x, y } = vector
    return {
        x: x * scalar,
        y: y * scalar
    }
}

export function addVectors(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

export function subtractVectors(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    }
}

export function vectorLength({ x, y}) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
}

export function vectorDistance(a, b) {
    return vectorLength(subtractVectors(a, b))
}
