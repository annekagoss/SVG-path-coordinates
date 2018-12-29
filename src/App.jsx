import React, { Component } from 'react'
import { hot } from 'react-hot-loader'
import DropZone from 'components/dropzone'
import { Point, BezierCurve, Graph, drawHandles } from 'lib/bezier'
import { parseFrames } from 'lib/svg'
import { makeTextFile } from 'lib/output'

const INTERPOLATE_LINES = true
const SAMPLES = 1
let FILE_CACHE = []

class App extends Component {
  constructor(props) {
    super(props);
  }

  state = {
      animFrames: []
  }

  loadFrames(animFrames) {
      this.setState({
          animFrames: parseFrames(animFrames, SAMPLES, INTERPOLATE_LINES)
      })
  }

  startAnimation(frames) {
    let count = 0
    setInterval(() => {
      if (count === frames.length) {
        count = 0
      }
      this.drawPreview(frames[count])
      count++
    }, 100)
  }

  drawPreview(animFrame) {
      setTimeout(() => {
          const graph = new Graph('graph-0')
          const bezierPoints = animFrame.coordinates.map(coord => (new Point(coord.x, animFrame.plotHeight - coord.y)))
          graph.clear()
          graph.drawCurveFromPoints(bezierPoints, `graph-${animFrame.frameNum}`)
      },0)
  }

  onFramesUpload = files => {
      FILE_CACHE = []
      const totalLength = files.length
      const promise = Promise.resolve()
      files.map(file => promise.then(() => this.readFile(file, totalLength)))
  }

  readFile(file, totalLength) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = () => this.resolveFile({ name: file.name, data: fileReader.result, totalLength })
      fileReader.readAsText(file)
    })
  }

  resolveFile({ name, data, totalLength }) {
    const frameNum = parseInt(name.match(/\d+/g)[0])
    FILE_CACHE.push({ num: frameNum, data })
    if (FILE_CACHE.length === totalLength) {
      FILE_CACHE.sort((a, b) => a.num - b.num)
      this.loadFrames(FILE_CACHE.map(file => (file.data)))
    }
  }

  render() {
    const { animFrames } = this.state
    return (
        <div>
            <DropZone onFramesUpload={this.onFramesUpload}/>
            { animFrames.length > 0 && (
              <div>
                <a download={`frame_${0}.txt`} href={makeTextFile(animFrames[0].coordinates, 0)}>download coordinates</a>
                <svg onLoad={this.startAnimation(animFrames)} width={`${animFrames[0].plotWidth}px`} height={`${animFrames[0].plotHeight}px`} id='graph-0'></svg>
              </div>
            )}

        </div>
    )
  }
}

export default hot(module)(App);
