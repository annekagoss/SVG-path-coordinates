function formatLineString(coords) {
    return coords.reduce((result, [start, finish], i) => {
        const row = i
        return result + i + ', ' + start + ' ' + finish + ';\n'
    }, '')
}

function formatPathString(coords) {
    return coords.reduce((result, { x, y }, i) => {
        return result + i + ', ' + x + ' ' + y + ';\n'
    }, '')
}

export function makeTextFile(text) {
    const string = formatPathString(text)
    const data = new Blob([string], {type: 'text/plain'});
    return window.URL.createObjectURL(data);
}
