import React, { Component } from 'react'
import { hot } from 'react-hot-loader'
import DropZone from 'components/dropzone'
import ProgressBar from 'components/progress'
import { Point, BezierCurve, Graph, drawHandles } from 'lib/bezier'
import { parseSVG, numPaths } from 'lib/svg'
import { makeTextFile } from 'lib/output'
import style from './styles.css'

const INTERPOLATE_LINES = true
const RENDER_WEIGHTS = true
const SAMPLES = 200
let FILE_CACHE = []

class App extends Component {
  constructor(props) {
    super(props);
  }

  state = {
      animFrames: [],
      width: 200,
      height: 200,
      loading: false,
      loadedFrames: 0,
      totalFrames: null,
      uploaded: true
  }

  count = 0

  componentDidMount() {
    const graph = new Graph('graph')
    this.setState({
      graph
    })
  }

  loadFrames(svgs) {
      const totalSamples = INTERPOLATE_LINES ? Math.max(...svgs.map(animFrame => (numPaths(animFrame)))) * SAMPLES : null
      const newFrames = []

      const promises = svgs.map((animFrame, i) => {
        return new Promise((resolve, reject) => {
          console.log('reading frame ', i+1)

           const paths = animFrame.match(/<(line|path|polygon)((.|\n)*?)\/>/g)
           const samplesPerPath = INTERPOLATE_LINES ? Math.floor(totalSamples / paths.length) : SAMPLES
           const options = {
             svg: animFrame,
             numSamples: samplesPerPath,
             minSamples: totalSamples,
             frameNum: i,
             interpolate: INTERPOLATE_LINES,
             graph: this.state.graph,
             paths
           }
           newFrames.push(parseSVG(options))

           this.setState(
             () => ({ loadedFrames: i + 1 }),
             () => resolve(i + 1)
            )
        })
      })

      Promise.all(promises)
        .then((val) => {
          this.setState({
              animFrames: newFrames,
              width: svgs[0].plotWidth,
              height: svgs[0].plotHeight,
              loading: false
          })
          this.startAnimation(newFrames)
        })
  }

  startAnimation(frames) {
    this.count = 0
    this.then = Date.now()
    this.drawPreview(frames)
  }

  drawPreview = frames => {
      if (frames.length > 1) {
        requestAnimationFrame(() => this.drawPreview(frames))

        const now = Date.now()
        const elapsed = now - this.then

        if (elapsed <= 1000/30) return

        this.then = now - (elapsed % (1000/30))
        if (this.count === frames.length) {
          this.count = 0
        }
      }

      const animFrame = frames[this.count]
      const beierCoords = RENDER_WEIGHTS ? animFrame.coordinates.weightedCoords : animFrame.coordinates.uniformCoords;
      const bezierPoints = beierCoords.filter(coord => !!coord).map(coord => (new Point(coord.x, coord.y, coord.weight)))
      this.state.graph.clear()
      this.state.graph.drawCurveFromPoints(bezierPoints)
      this.count++
  }

  onFramesUpload = files => {
      FILE_CACHE = []
      const totalLength = files.length
      const promises = files.map(file => (this.readFile(file, totalLength)))

      this.setState({
        loading: true,
        totalFrames: totalLength
      })

      Promise.all(promises)
        .then(() => {
          FILE_CACHE.sort((a, b) => a.num - b.num)
            this.setState({
              uploaded: true
            })
            this.loadFrames(FILE_CACHE.map(file => (file.data)))
        })
  }

  readFile(file, totalLength) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = () => {
        this.resolveFile({ name: file.name, data: fileReader.result, totalLength })
        resolve()
      }
      fileReader.readAsText(file)
    })
  }

  resolveFile({ name, data, totalLength }) {
    const nameDigits = name.match(/\d+/g)
    const frameNum = nameDigits ? parseInt(nameDigits[0]) : 0
    FILE_CACHE.push({ num: frameNum, data })
  }

  render() {
    const { animFrames, loading, totalFrames, loadedFrames } = this.state
    return (
        <div>
            <DropZone onFramesUpload={this.onFramesUpload}/>
            <ProgressBar loadedFrames={loadedFrames} totalFrames={totalFrames} ref={(el) => this.$progress = el}/>
            { animFrames.length > 0 && (
              <div className={style.preview}>
                <svg width={`${animFrames[0].plotWidth}px`} height={`${animFrames[0].plotHeight}px`} id='graph'></svg>
                <a className={style.link} download={`frame_${0}.txt`} href={makeTextFile(animFrames, false)}>download coordinates</a>
                <a className={style.link} download={`frame_${0}_weighted.txt`} href={makeTextFile(animFrames, true)}>download weighted coordinates</a>
              </div>
            )}

        </div>
    )
  }
}

export default hot(module)(App);
