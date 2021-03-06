import {
  lerpPoints,
  lerpVectors,
  scaleVector,
  addVectors,
  subtractVectors,
  vectorLength,
  vectorDistance,
} from './math.js'

import {
  Point,
  BezierCurve,
  drawHandles,
} from './bezier.js'

const RULE_TYPES = {
    M: 'start',
    C: 'absolute bezier',
    c: 'relative bezier',
    s: 'relative s bezier',
    S: 'absolute s bezier',
    L: 'absolute line',
    l: 'relative line',
    H: 'absolute horizontal line',
    h: 'relative horizontal line',
    V: 'absolute vertical line',
    v: 'relative vertical line',
    z: 'end',
}

function matchCoord(line, first, last) {
    const match = line.match(`${first}=((.|\n)*)${last}`)
    return match && parseFloat(match[1].split('"').join(''))
}

function coordinatesFromRules(rules, plotHeight, graph, numSamples, transforms) {
    let currentPos = { x: null, y: null }
    let lastBezier = null
    let coordinates = []

    rules.forEach(rule => {
        if (rule.length < 3) return
        const first = rule[0]
        const [foo, rest] = rule.split(first)
        const type = RULE_TYPES[first];

        switch (type) {
            case 'start':
                const startCoords = stringToCoords(rest)
                currentPos = {
                  x: startCoords.x,
                  y: startCoords.y,
                }
                coordinates.push({
                  x: startCoords.x,
                  y: startCoords.y,
                })
                return
            case 'absolute line':
                const absLinePoints = absLineCoords(currentPos, rest, numSamples);
                currentPos = absLinePoints[absLinePoints.length - 1]
                coordinates = coordinates.concat(absLinePoints)
                return
            case 'relative line':
                const relLinePoints = relLineCoords(currentPos, rest, numSamples)
                currentPos = relLinePoints[relLinePoints.length - 1]
                coordinates = coordinates.concat(relLinePoints)
                return
            case 'absolute horizontal line':
                const absHLinePoints = absHorizontalLineCoords(currentPos, rest, numSamples);
                currentPos = absHLinePoints[absHLinePoints.length - 1]
                coordinates = coordinates.concat(absHLinePoints)
                return
            case 'relative horizontal line':
                const relHLinePoints = relHorizontalLineCoords(currentPos, rest, numSamples)
                currentPos = relHLinePoints[relHLinePoints.length - 1]
                coordinates = coordinates.concat(relHLinePoints)
                return
            case 'absolute vertical line':
                const absVLinePoints = absVerticalLineCoords(currentPos, rest, numSamples);
                currentPos = absVLinePoints[absVLinePoints.length - 1]
                coordinates = coordinates.concat(absVLinePoints)
                return
            case 'relative vertical line':
                const relVLinePoints = relVerticalLineCoords(currentPos, rest, numSamples)
                currentPos = relVLinePoints[relVLinePoints.length - 1]
                coordinates = coordinates.concat(relVLinePoints)
                return
            case 'absolute bezier':
                const {
                    points: absBezPoints,
                    bezB: absBezB,
                    endPoint: absEndPoint,
                } = absBezierCoords(rest, plotHeight, numSamples, currentPos)
                currentPos = absEndPoint
                lastBezier = absBezB || lastBezier
                coordinates.push(...absBezPoints)
                return
            case 'relative bezier':
                const {
                    points: relBezPoints,
                    endPoint: relEndPoint,
                    bezB: relBezB,
                } = relBezierCoords(currentPos, rest, plotHeight, graph, numSamples)
                currentPos = relEndPoint
                lastBezier = relBezB || lastBezier
                coordinates.push(...relBezPoints)
                return
            case 'relative s bezier':
                const {
                    points: relSBezPoints,
                    endPoint: relSEndPoint,
                    bezB: relSBezB,
                } = relSBezierCoords(currentPos, lastBezier, rest, plotHeight, graph, numSamples)
                currentPos = relSEndPoint
                lastBezier = relSBezB || lastBezier
                coordinates.push(...relSBezPoints)
                return
            case 'absolute s bezier':
                const {
                    points: absSBezPoints,
                    endPoint: absSEndPoint,
                    bezB: absSBezB,
                } = absSBezierCoords(currentPos, lastBezier, rest, plotHeight, graph, numSamples)
                currentPos = absSEndPoint
                lastBezier = absSBezB || lastBezier
                coordinates.push(...absSBezPoints)
                return
            case 'end':
                coordinates.push(currentPos)
                return
            default:
              console.log('NEEDS LOGIC', { rule, type })
                break
        }
    })
    return applyTransformations(coordinates, transforms)
}

function applyTransformations(coordinates, transformations) {
  if (!transformations) return coordinates
  debugger
}

function stringToCoords(string, height) {
    const [x, y] = string.split(',').map(coord => (parseFloat(coord)))
    return { x, y }
}

function invertY({ x, y }, height) {
  return { x, y: height - y }
}

function ruleToCoords(string) {
    return string.replace(/-/g, ',-').split(',').filter(coord => coord !== '').map(coord => parseFloat(coord))
}

function interpolatePoints(start, end, numSamples) {
    const interpolatedPoints = []
    for (let i = 0; i < numSamples; i++) {
        const t = (i / numSamples)
        interpolatedPoints.push(lerpPoints(start, end, t))
    }

    return interpolatedPoints
}

function absLineCoords(currentPos, string, numSamples) {
    const endPoint = stringToCoords(string);
    return interpolatePoints(currentPos, endPoint, numSamples);
}

function absHorizontalLineCoords(currentPos, string, numSamples) {
    const endPoint = {
        x: parseFloat(string),
        y: currentPos.y,
    }
    return interpolatePoints(currentPos, endPoint, numSamples);
}

function absVerticalLineCoords(currentPos, string, numSamples) {
    const endPoint = {
        x: currentPos.x,
        y: parseFloat(string),
    }
    return interpolatePoints(currentPos, endPoint, numSamples);
}

function absBezierCoords(string, plotHeight, numSamples, currentPos) {
    const [handleAx, handleAy, handleBx, handleBy, finalx, finaly] = ruleToCoords(string)

    const startPoint = new Point(currentPos.x, currentPos.y);
    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(handleBx, handleBy)
    const endPoint = new Point(finalx, finaly)

    const bezierCurve = new BezierCurve([startPoint, bezA, bezB, endPoint], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y },
    }
}

function relBezierCoords(currentPos, string, plotHeight, graph, numSamples) {
    const [handleAx, handleAy, handleBx, handleBy, finalx, finaly] = ruleToCoords(string)
    const startPoint = new Point(currentPos.x, currentPos.y);
    const bezA = new Point(currentPos.x + handleAx, currentPos.y + handleAy)
    const bezB = new Point(currentPos.x + handleBx, currentPos.y + handleBy)
    const endPoint = new Point(currentPos.x + finalx, currentPos.y + finaly)

    const bezierCurve = new BezierCurve([startPoint, bezA, bezB, endPoint], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y },
    }
}

function relLineCoords(currentPos, string, numSamples) {
  const [x, y] = ruleToCoords(string)
  const endPoint = { x: currentPos.x + x, y: currentPos.y + y }
  return interpolatePoints(currentPos, endPoint, numSamples);
}

function relHorizontalLineCoords(currentPos, string, numSamples) {
  const [x] = ruleToCoords(string)
  const endPoint = {
    x: currentPos.x + x,
    y: currentPos.y,
  }
  return interpolatePoints(currentPos, endPoint, numSamples);
}

function relVerticalLineCoords(currentPos, string, numSamples) {
    const [y] = ruleToCoords(string)
    const endPoint = {
      x: currentPos.x,
      y: currentPos.y + y,
    }
    return interpolatePoints(currentPos, endPoint, numSamples);
  }

function relSBezierCoords(currentPos, lastBezier, string, plotHeight, graph, numSamples) {
    const [handleBx, handleBy, finalx, finaly] = ruleToCoords(string)

    const newHandleBx = currentPos.x
    const newHandleBy = currentPos.y

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const startPoint = new Point(currentPos.x, currentPos.y);
    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(currentPos.x + finalx, currentPos.y + finaly)

    const bezierCurve = new BezierCurve([startPoint, bezA, bezB, endPoint], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y },
    }
}

function absSBezierCoords(currentPos, lastBezier, string, plotHeight, graph, numSamples) {
    const [handleBx, handleBy, finalx, finaly] = ruleToCoords(string)

    const newHandleBx = lastBezier.x
    const newHandleBy = lastBezier.y

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const startPoint = new Point(currentPos.x, currentPos.y);
    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(finalx, finaly)

    const bezierCurve = new BezierCurve([startPoint, bezA, bezB, endPoint], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y },
    }
}

function pathCoords(path, plotHeight, graph, numSamples) {
    const [idProp] = path.match('id=\"((.|\n)*?\")') || []
    const [classProp] = path.match('class=\"((.|\n)*?\")') || []

    let instructions = path.replace(idProp, '').replace(classProp, '').match('d=((.|\n)*)')[1]
    const transforms = instructions.match('transform=\"(.|\n)*\"')
    transforms && transforms.forEach(transform => {
      instructions = instructions.replace(transform, '')
    })

    const rules = instructions.replace('/>', '').split(/(?=[A-Za-z])/).filter(rule => rule !== '"')
    return coordinatesFromRules(rules, plotHeight, graph, numSamples, transforms)
}

function polygonCoords(polygon, plotHeight, numSamples, interpolate) {
    const points = polygon.match('points=((.|\n)*)')[1].split(' ').map(point => point.split(',').map(coord => parseFloat(coord.replace(/"/g, '')))).filter(point => point.length === 2).map(point => ({ x: point[0], y: point[1] }))
    const closedPoints = [...points, points[0]]

    if (!interpolate) return closedPoints

    const interpolatedPoints = []

    for (let i = 0; i < closedPoints.length - 1; i++) {
        const startPoint = closedPoints[i]
        const endPoint = closedPoints[i + 1]

        for (let j = 0; j < numSamples; j++) {
            const t = j / numSamples
            interpolatedPoints.push(lerpVectors(startPoint, endPoint, t))
        }
    }
    return interpolatedPoints
}

function lineCoords(line, plotHeight, numSamples, interpolate) {
    const x1 = matchCoord(line, 'x1', 'y1')
    const y1 = matchCoord(line, 'y1', 'x2')
    const x2 = matchCoord(line, 'x2', 'y2')
    const y2 = matchCoord(line, 'y2', '/')

    const startPoint = { x: x1, y: y1 }
    const endPoint = { x: x2, y: y2 }

    if (!interpolate) {
        return [startPoint, endPoint]
    }

    // const interpolatedPoints = []
    // for (let i = 0; i < numSamples; i++) {
    //     const t = 1 - (i / numSamples)
    //     interpolatedPoints.push(lerpVectors(startPoint, endPoint, t))
    // }

    // return interpolatedPoints
    return interpolatePoints(startPoint, endPoint, numSamples);
}

function circleCoords(circle, numSamples = 20) {
    const cx = matchCoord(circle, 'cx', 'cy');
    const cy = matchCoord(circle, 'cy', 'r');
    const radius = matchCoord(circle, 'r', '/');
    const points = [];

    for (let i = 0; i < numSamples; i++) {
        const phase = (i / numSamples) * 2 * 3.14159265359;
        const x = radius * Math.cos(phase) + cx;
        const y = radius * Math.sin(phase) + cy;
        points.push({ x, y });
    }

    return points;
}

export function numPaths(svg) {
    const paths = svg.match(/<(line|path|polygon)((.|\n)*?)\/>/g)
    return paths ? paths.length : 0
}

function extendCoords(coords, minSamples) {
    if (coords.length < minSamples) {
        const extension = new Array(minSamples - coords.length).fill(coords[coords.length - 1])
        return coords.concat(extension)
    }
    return coords.splice(0, minSamples)
}

function sortAllByVicinity(coords) {
  const { uniformCoords, weightedCoords } = coords;
  return {
    uniformCoords: sortByVicinity(uniformCoords),
    weightedCoords: sortByVicinity(weightedCoords),
  }
}

function sortByVicinity(coordinates) {
    let toSort = coordinates.map((list, i) => ({ key: i, coordinates: list }))
    const keyedCoordinates = [...toSort]
    const sorted = []

    keyedCoordinates.forEach(list => {
        if (sorted.length === 0) {
            sorted.push(list)
            return
        }
        const closestList = findClosestList(list.coordinates[list.coordinates.length - 1], toSort)
        sorted.push(closestList)
        toSort = toSort.filter(list => (list.key !== closestList.key))
    })

    return [...sorted].map(item => (item.coordinates)).flat()
}

function findClosestList(lastPoint, lists) {
    const weightedLists = lists.reduce((result, list) => {
        const distance = vectorDistance(list.coordinates[0], lastPoint)
        result.push({ ...list, distance })
        return result
    }, [])
    return weightedLists.sort((a, b) => (a.distance - b.distance))[0]
}

const getWeightForSample = (index, numSamples, totalSamples) => {
  if (index < totalSamples - numSamples) return 1;
  return 0;
}

const addWeight = (coords, numSamples) => {
  if (!(coords && numSamples)) return []
  return coords.map((coord, i) => ({
    ...coord,
    weight: getWeightForSample(i, numSamples, coords.length),
  }))
}

export function parseSVG(options) {
    const {
 svg, numSamples, minSamples, frameNum = 0, interpolate, graph, paths,
} = options
    const plotSize = svg.match('viewBox="((.|\n)*)">')[1]
    const plotWidth = parseFloat(plotSize.split(' ')[2])
    const plotHeight = parseFloat(plotSize.split(' ')[3])
    const initialResult = {
      uniformCoords: [],
      weightedCoords: [],
    }

    console.log({ paths })

    const coordinates = paths.reduce((result, tag) => {
        if (tag.match('path')) {
            const coords = pathCoords(tag, plotHeight, graph, numSamples, interpolate)
            result.uniformCoords.push(coords)
            result.weightedCoords.push(addWeight(coords, numSamples))
            return result
        } if (tag.match('polygon')) {
            const coords = polygonCoords(tag, plotHeight, numSamples, interpolate)
            result.uniformCoords.push(coords)
            result.weightedCoords.push(addWeight(coords, numSamples))
            return result
        } if (tag.match('circle')) {
            const coords = circleCoords(tag, numSamples, interpolate);
            if (!coords.length) return result;
            result.uniformCoords.push(coords)
            result.weightedCoords.push(addWeight(coords, numSamples))
            return result;
        }
        const coords = lineCoords(tag, plotHeight, numSamples, interpolate)
        result.uniformCoords.push(coords)
        result.weightedCoords.push(addWeight(coords, numSamples))
        return result;
    }, initialResult);

    const sortedCoordinates = sortAllByVicinity(coordinates)
    console.log({ coordinates, sortedCoordinates })

    return {
        frameNum,
        coordinates: sortedCoordinates,
        plotWidth,
        plotHeight,
    };
}
