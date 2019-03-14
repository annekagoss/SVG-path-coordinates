function formatLineString(coords) {
    return coords.uniformCoords.reduce((result, [start, finish], i) => {
        const row = i
        return result + i + ', ' + start + ' ' + finish + ';\n'
    }, '')
}

function formatPathString(coords, frameNum) {
    return coords.filter(coord => !!coord).reduce((result, { x, y, weight }, i) => {
        const weightString = weight ?
          ', ' + weight + ';\n' :
          ';\n';
        return result + (coords.length*frameNum+i) + ', ' + x + ' ' + y + weightString;
    }, '')
}

const getFrameCoords = (frame, useWeighted) => {
  return useWeighted ? frame.coordinates.weightedCoords : frame.coordinates.uniformCoords;
}

export function makeTextFile(frames, useWeighted) {
    const combinedText = frames.map((frame, i) => (formatPathString(getFrameCoords(frame, useWeighted), i)))
    const data = new Blob(combinedText, {type: 'text/plain'});
    return window.URL.createObjectURL(data);
}
