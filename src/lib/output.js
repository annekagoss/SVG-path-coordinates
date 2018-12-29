function formatLineString(coords) {
    return coords.reduce((result, [start, finish], i) => {
        const row = i
        return result + i + ', ' + start + ' ' + finish + ';\n'
    }, '')
}

function formatPathString(coords, frameNum) {
    return coords.reduce((result, { x, y }, i) => {
        return result + (coords.length*frameNum+i) + ', ' + x + ' ' + y + ';\n'
    }, '')
}

export function makeTextFile(frames) {
    const combinedText = frames.map((frame, i) => (formatPathString(frame.coordinates, i)))
    const data = new Blob(combinedText, {type: 'text/plain'});
    return window.URL.createObjectURL(data);
}
