import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import { Point, BezierCurve, Graph, drawHandles } from 'bezier';
import ico1 from 'images/ico_1';
import squiggle from 'images/squiggle';
import squiggle3 from 'images/squiggle3';
import squiggleLine from 'images/squiggle_line';

const svg = ico1;

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


function makeTextFile(text) {
    const data = new Blob([text], {type: 'text/plain'});
    return window.URL.createObjectURL(data);
}

function coordinatesFromRules(rules, plotHeight, graph) {
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
                const startCoords = stringToCoords(rest)
                currentPos = startCoords
                coordinates.push(startCoords)
                return
            case 'absolute bezier':
                const {
                    points: absBezPoints,
                    bezB: absBezB,
                    endPoint: absEndPoint
                } = absBezierCoords(rest, plotHeight)
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

function stringToCoords(string) {
    const [x, y] = string.split(',').map(coord => (parseFloat(coord)))
    return { x, y: 205 - y }
}

function ruleToCoords(string) {
    return string.replace(/-/g, ',-').split(',').filter(coord => coord !== '').map(coord => parseFloat(coord))
}

function absBezierCoords(string, plotHeight) {
    const [ handleAx, handleAy, handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(handleBx, handleBy)
    const endPoint = new Point(finalx, finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function relBezierCoords(currentPos, string, plotHeight, graph) {
    const [ handleAx, handleAy, handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const bezA = new Point(currentPos.x + handleAx, plotHeight - currentPos.y + handleAy)
    const bezB = new Point(currentPos.x + handleBx, plotHeight - currentPos.y + handleBy)
    const endPoint = new Point(currentPos.x + finalx, plotHeight - currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight)
    drawHandles(graph, bezierCurve)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function sBezierCoords(currentPos, lastBezier, string, plotHeight, graph) {
    const [ handleBx, handleBy, finalx, finaly ] = ruleToCoords(string)

    const newHandleBx = currentPos.x + (currentPos.x - lastBezier.x)
    const newHandleBy = currentPos.y + (currentPos.y - lastBezier.y)

    const handleAx = currentPos.x
    const handleAy = currentPos.y

    const bezA = new Point(handleAx, handleAy)
    const bezB = new Point(newHandleBx, newHandleBy)
    const endPoint = new Point(currentPos.x + finalx, plotHeight - currentPos.y + finaly)

    const bezierCurve = new BezierCurve([ bezA, bezB, endPoint ], plotHeight)

    drawHandles(graph, bezierCurve)

    return {
        points: bezierCurve.drawingPoints.map(point => ({ x: point.x, y: point.y })),
        endPoint: { x: endPoint.x, y: endPoint.y },
        bezB: { x: bezB.x, y: bezB.y }
    }
}

function pathCoords(path, plotHeight, graph) {
    const instructions = path.match('d=(.*)')[1]
    const rules = instructions.split(/(?=[A-Za-z])/)
    return coordinatesFromRules(rules, plotHeight, graph)
}

function lineCoords(line, plotHeight) {
    const x1 = matchCoord(line, 'x1', 'y1')
    const y1 = plotHeight - matchCoord(line, 'y1', 'x2')
    const x2 = matchCoord(line, 'x2', 'y2')
    const y2 = plotHeight - matchCoord(line, 'y2', '/')
    return [
        { x: x1, y: y1 },
        { x: x2, y: y2 }
    ]
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
        plotWidth: 200,
        plotHeight: 200
    };
  }

  componentDidMount() {
      const plotSize = svg.match('viewBox="(.*)" style')[1]
      const plotWidth = parseFloat(plotSize.split(' ')[2])
      const plotHeight = parseFloat(plotSize.split(' ')[3])

      const graph = new Graph('graph');

      const linesAndPaths = svg.match(/<(line|path)(.*)\/>/g)

      const linesAndPathsCoordinates = linesAndPaths.map(lineOrPath => {
          if (lineOrPath.match('path')) {
              return pathCoords(lineOrPath, plotHeight, graph)
          }
          return lineCoords(lineOrPath, plotHeight)
      }).flat()

    const bezierPoints = linesAndPathsCoordinates.map(coord => (new Point(coord.x, plotHeight - coord.y)))
    graph.drawCurveFromPoints(bezierPoints);
    const coordinates = formatPathString(linesAndPathsCoordinates)

    this.setState({
        coordinates,
        plotWidth,
        plotHeight
     })
  }

  render() {
    const { coordinates, plotWidth, plotHeight } = this.state
    return (
        <div>
            {coordinates &&
                <a download='coords.txt' href={makeTextFile(coordinates)}>download coordinates</a>
            }
            <svg width={`${plotWidth}px`} height={`${plotHeight}px`} id="graph"></svg>
        </div>
    )
  }
}

export default hot(module)(App);
