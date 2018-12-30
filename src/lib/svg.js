import {
  lerpVectors,
  scaleVector,
  addVectors,
  subtractVectors,
  vectorLength,
  vectorDistance
} from './math.js'

const RULE_TYPES = {
    'M': 'start',
    'C': 'absolute bezier',
    's': 's bezier',
    'c': 'relative bezier',
    'L': 'absolute line',
    'z': 'end'
}

function matchCoord(line, first, last) {
    const match = line.match(`${first}=(.*)${last}`)
    return match && parseFloat(match[1].split('"').join(''))
}

function coordinatesFromRules(rules, plotHeight, graph, numSamples) {
    let currentPos = { x: null, y: null }
    let lastBezier = null
    const coordinates = []

    rules.forEach(rule => {
        if (rule.length < 3) return
        const first = rule[0]
        const [ foo, rest ] = rule.split(first)
        const type = RULE_TYPES[first] || 'end';

        switch (type) {
            case 'start':
                const startCoords = stringToCoords(rest, plotHeight)
                currentPos = startCoords
                coordinates.push(startCoords)
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
                } = relBezierCoords(currentPos, rest, plotHeight, graph)
                currentPos = relEndPoint
                lastBezier = relBezB || lastBezier
                coordinates.push(...relBezPoints)
                return
            case 's bezier':
                const {
                    points: sBezPoints,
                    endPoint: sEndPoint,
                    bezB: sBezB
                } = sBezierCoords(currentPos, lastBezier, rest, plotHeight, graph)
                currentPos = sBezPoints[sBezPoints.length-1]
                lastBezier = sBezB || lastBezier
                coordinates.push(...sBezPoints)
                return
            default:
                break
        }
    })

    return coordinates
}

function stringToCoords(string, height) {
    const [x, y] = string.split(',').map(coord => (parseFloat(coord)))
    return { x, y: height - y } // replace with SVG height
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

    const bezA = new Point(currentPos.x + handleAx, plotHeight - currentPos.y + handleAy)
    const bezB = new Point(currentPos.x + handleBx, plotHeight - currentPos.y + handleBy)
    const endPoint = new Point(currentPos.x + finalx, plotHeight - currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)
    drawHandles(graph, bezierCurve)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function sBezierCoords(currentPos, lastBezier, string, plotHeight, graph, numSamples) {
    const [ handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const newHandleBx = currentPos.x + (currentPos.x - lastBezier.x)
    const newHandleBy = currentPos.y + (currentPos.y - lastBezier.y)

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(currentPos.x + finalx, plotHeight - currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight, numSamples)

    drawHandles(graph, bezierCurve)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function pathCoords(path, plotHeight, graph, numSamples) {
    const instructions = path.match('d=(.*)')[1]
    const rules = instructions.split(/(?=[A-Za-z])/)
    return coordinatesFromRules(rules, plotHeight, graph, numSamples)
}

function polygonCoords(polygon, plotHeight, numSamples, interpolate) {
    const points = polygon.match('points=(.*)')[1].split(' ').map(point => {
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
    const paths = svg.match(/<(line|path|polygon)(.*)\/>/g)
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


export function parseSVG(svg, numSamples, minSamples, frameNum = 0, interpolate) {
    const plotSize = svg.match('viewBox="(.*)" style')[1]
    const plotWidth = parseFloat(plotSize.split(' ')[2])
    const plotHeight = parseFloat(plotSize.split(' ')[3])
    const tags = svg.match(/<(line|path|polygon)(.*)\/>/g)

    const coordinates = tags.map(tag => {
        if (tag.match('path')) {
            return pathCoords(tag, plotHeight, graph, numSamples, interpolate)
        } else if (tag.match('polygon')) {
            return polygonCoords(tag, plotHeight, numSamples, interpolate)
        }
        return lineCoords(tag, plotHeight, numSamples, interpolate)
    })
    const sortedCoordinates = sortByVicinity(coordinates)
    return { frameNum, coordinates: sortedCoordinates, plotWidth, plotHeight }
}
