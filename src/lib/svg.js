import {
  lerpVectors,
  scaleVector,
  addVectors,
  subtractVectors,
  vectorLength,
  vectorDistance
} from './math.js'

import {
  Point,
  BezierCurve,
  drawHandles
} from './bezier.js'

const RULE_TYPES = {
    'M': 'start',
    'C': 'absolute bezier',
    'c': 'relative bezier',
    's': 'relative s bezier',
    'S': 'absolute s bezier',
    'L': 'absolute line',
    'l': 'relative line',
    'h': 'relative horizontal line',
    'z': 'end'
}

function matchCoord(line, first, last) {
    const match = line.match(`${first}=((.|\n)*)${last}`)
    return match && parseFloat(match[1].split('"').join(''))
}

function coordinatesFromRules(rules, plotHeight, graph, numSamples, transforms) {
    let currentPos = { x: null, y: null }
    let lastBezier = null
    const coordinates = []

    rules.forEach(rule => {
        if (rule.length < 3) return
        const first = rule[0]
        const [ foo, rest ] = rule.split(first)
        const type = RULE_TYPES[first];

        switch (type) {
            case 'start':
                const startCoords = stringToCoords(rest)
                currentPos = {
                  x: startCoords.x,
                  y: startCoords.y
                }
                coordinates.push({
                  x: startCoords.x,
                  y: plotHeight - startCoords.y
                })
                return
            case 'absolute line':
                const point = stringToCoords(rest)
                currentPos = {
                  x: point.x,
                  y: point.y
                }
                coordinates.push({
                  x: point.x,
                  y: plotHeight - point.y
                })
                return
            case 'relative line':
                const relLinePoints = relLineCoords(currentPos, rest, plotHeight)
                currentPos = relLinePoints[1]
                coordinates.concat(relLinePoints)
                return
            case 'relative horizontal line':
                const { x, y } = relHorizontalLineCoords(currentPos, rest, plotHeight)
                currentPos = {
                  x,
                  y: plotHeight - y
                }
                coordinates.push({ x, y })
                return
            case 'absolute bezier':
                const {
                    points: absBezPoints,
                    bezB: absBezB,
                    endPoint: absEndPoint
                } = absBezierCoords(rest, plotHeight, numSamples)
                currentPos = absEndPoint
                lastBezier = absBezB || lastBezier
                coordinates.push(...absBezPoints)
                return
            case 'relative bezier':
                const {
                    points: relBezPoints,
                    endPoint: relEndPoint,
                    bezB: relBezB
                } = relBezierCoords(currentPos, rest, plotHeight, graph, numSamples)
                currentPos = relEndPoint
                lastBezier = relBezB || lastBezier
                coordinates.push(...relBezPoints)
                return
            case 'relative s bezier':
                const {
                    points: relSBezPoints,
                    endPoint: relSEndPoint,
                    bezB: relSBezB
                } = relSBezierCoords(currentPos, lastBezier, rest, plotHeight, graph, numSamples)
                currentPos = relSEndPoint
                lastBezier = relSBezB || lastBezier
                coordinates.push(...relSBezPoints)
                return
            case 'absolute s bezier':
                const {
                    points: absSBezPoints,
                    endPoint: absSEndPoint,
                    bezB: absSBezB
                } = absSBezierCoords(currentPos, lastBezier, rest, plotHeight, graph, numSamples)
                currentPos = absSEndPoint
                lastBezier = absSBezB || lastBezier
                coordinates.push(...absSBezPoints)
                return
            case 'end':
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

function absBezierCoords(string, plotHeight, numSamples) {
    const [ handleAx, handleAy, handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(handleBx, handleBy)
    const endPoint = new Point(finalx, finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function relBezierCoords(currentPos, string, plotHeight, graph, numSamples) {
    const [ handleAx, handleAy, handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)
    const bezA = new Point(currentPos.x + handleAx, currentPos.y + handleAy)
    const bezB = new Point(currentPos.x + handleBx, currentPos.y + handleBy)
    const endPoint = new Point(currentPos.x + finalx, currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function relLineCoords(currentPos, string, plotHeight) {
  const [x, y] = ruleToCoords(string)
  const point = { x: currentPos.x + x, y: currentPos.y + y}
  return [ currentPos, point ]
}

function relHorizontalLineCoords(currentPos, string, plotHeight) {
  const [x] = ruleToCoords(string)
  return {
    x: currentPos.x + x, y: plotHeight - currentPos.y
  }
}

function relSBezierCoords(currentPos, lastBezier, string, plotHeight, graph, numSamples) {
    const [ handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const newHandleBx = currentPos.x
    const newHandleBy = currentPos.y

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(currentPos.x + finalx, currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function absSBezierCoords(currentPos, lastBezier, string, plotHeight, graph, numSamples) {
    const [ handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const newHandleBx = lastBezier.x
    const newHandleBy = lastBezier.y

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(finalx, finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function pathCoords(path, plotHeight, graph, numSamples) {
    const [idProp, ] = path.match('id=\"((.|\n)*?\")') || []
    const [classProp, ] = path.match('class=\"((.|\n)*?\")') || []

    let instructions = path.replace(idProp, '').replace(classProp, '').match('d=((.|\n)*)')[1]
    const transforms = instructions.match('transform=\"(.|\n)*\"')
    transforms && transforms.forEach(transform => {
      instructions = instructions.replace(transform, '')
    })

    const rules = instructions.replace('/>', '').split(/(?=[A-Za-z])/).filter(rule => rule !== '"')
    return coordinatesFromRules(rules, plotHeight, graph, numSamples, transforms)
}

function polygonCoords(polygon, plotHeight, numSamples, interpolate) {
    const points = polygon.match('points=((.|\n)*)')[1].split(' ').map(point => {
        return point.split(',').map(coord => {
            return parseFloat(coord.replace(/"/g, ''))
        })
    }).filter(point => point.length === 2).map(point => ({ x: point[0], y: point[1] }))
    const closedPoints = [...points, points[0]]

    if (!interpolate) return closedPoints

    const interpolatedPoints = []

    for (let i = 0; i < closedPoints.length - 1; i ++ ) {
        let startPoint = closedPoints[i]
        let endPoint = closedPoints[i+1]

        for (let j = 0; j < numSamples; j ++) {
            const t = j / numSamples
            interpolatedPoints.push(lerpVectors(startPoint, endPoint, t))
        }
    }
    return interpolatedPoints
}

function lineCoords(line, plotHeight, numSamples, interpolate) {
    const x1 = matchCoord(line, 'x1', 'y1')
    const y1 = plotHeight - matchCoord(line, 'y1', 'x2')
    const x2 = matchCoord(line, 'x2', 'y2')
    const y2 = plotHeight - matchCoord(line, 'y2', '/')

    const startPoint = { x: x1, y: y1 }
    const endPoint = { x: x2, y: y2 }

    if (!interpolate) {
        return [ startPoint, endPoint ]
    }

    const interpolatedPoints = []
    for (let i = 0; i < numSamples; i++) {
        const t = 1 - (i / numSamples)
        interpolatedPoints.push(lerpVectors(startPoint, endPoint, t))
    }

    return interpolatedPoints
}

export function numPaths(svg) {
    const paths = svg.match(/<(line|path|polygon)((.|\n)*?)\/>/g)
    return paths ? paths.length : 0
}

function extendCoords(coords, minSamples) {
    if (coords.length < minSamples) {
        const extension = new Array(minSamples - coords.length).fill(coords[coords.length-1])
        return coords.concat(extension)
    }
    return coords.splice(0, minSamples)
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
        const closestList = findClosestList(list.coordinates[list.coordinates.length-1], toSort)
        sorted.push(closestList)
        toSort = toSort.filter(list => (list.key !== closestList.key))
    })

    return [ ...sorted, ...toSort ].map(item => (item.coordinates)).flat()
}

function findClosestList(lastPoint, lists) {
    const weightedLists = lists.reduce((result, list) => {
        const distance = vectorDistance(list.coordinates[0], lastPoint)
        result.push({ ...list, distance })
        return result
    }, [])
    return weightedLists.sort((a,b) => (a.distance - b.distance))[0]
}


export function parseSVG(options) {
    const { svg, numSamples, minSamples, frameNum = 0, interpolate, graph, paths } = options
    const plotSize = svg.match('viewBox="((.|\n)*)">')[1]
    const plotWidth = parseFloat(plotSize.split(' ')[2])
    const plotHeight = parseFloat(plotSize.split(' ')[3])

    const coordinates = paths.reduce((result, tag) => {
        if (tag.match('path')) {
            result.push(pathCoords(tag, plotHeight, graph, numSamples, interpolate))
        } else if (tag.match('polygon')) {
            result.push(polygonCoords(tag, plotHeight, numSamples, interpolate))
        } else {
          result.push(lineCoords(tag, plotHeight, numSamples, interpolate))
        }
        return result
    }, [])

    const sortedCoordinates = sortByVicinity(coordinates)
    return { frameNum, coordinates: sortedCoordinates, plotWidth, plotHeight }
}
