import React, { Component } from 'react'
import { hot } from 'react-hot-loader'
import DropZone from 'components/dropzone'
import ProgressBar from 'components/progress'
import { Point, BezierCurve, Graph, drawHandles } from 'lib/bezier'
import { parseSVG, numPaths } from 'lib/svg'
import { makeTextFile } from 'lib/output'
import style from './styles.css'

const INTERPOLATE_LINES = true
const SAMPLES = 1
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

  loadFrames(svgs) {
    console.log('LOAD FRAMES')
      const totalSamples = INTERPOLATE_LINES ? Math.max(...svgs.map(animFrame => (numPaths(animFrame)))) * SAMPLES : null
      const newFrames = []

      // svgs.forEach((animFrame, i) => {
      //     console.log(`reading frame ${i}...`)
      //     const paths = numPaths(animFrame)
      //     const samplesPerPath = INTERPOLATE_LINES ? Math.floor(totalSamples / paths) : samples
      //     newFrames.push(parseSVG(animFrame, samplesPerPath, totalSamples, i, INTERPOLATE_LINES))
      //     // this.setState({
      //     //   loadedFrames: i+1
      //     // })
      //     //
      //     // document.querySelector('#progress').style.display = 'none'
      //     // setTimeout(() => {
      //     //   document.querySelector('#progress').style.display = 'block'
      //     //
      //     // }, 0)
      //     //
      //     // this.$progress.forceUpdate()
      //     // this.forceUpdate()
      // })

      const promises = svgs.map((animFrame, i) => {
        return new Promise((resolve, reject) => {
          console.log('reading frame ', i+1)
           const paths = numPaths(animFrame)
           const samplesPerPath = INTERPOLATE_LINES ? Math.floor(totalSamples / paths) : samples
           newFrames.push(parseSVG(animFrame, samplesPerPath, totalSamples, i, INTERPOLATE_LINES))


           this.setState(
             () => ({ loadedFrames: i + 1 }),
             () => resolve(i + 1)
            )


            // setTimeout(() => {
              // console.log('repaint ', i+1)
              //  document.querySelector('#progress').innerHTML = i+1
              // document.querySelector('#progress').style.display = 'none'
              // document.querySelector('#progress').style.display = 'block'
            // }, 0)
           // document.querySelector('#progress').innerHTML = i+1
           //  document.querySelector('#progress').style.display = 'none'
           //  // setTimeout(() => {
           //    document.querySelector('#progress').style.display = 'block'
            // }, 0)
           //  //
           //  // this.$progress.forceUpdate()
           //  // this.forceUpdate()

           // const progress = document.createElement('div');
           // const container = document.querySelector('#progress-container')
           // progress.innerHTML = i+1
           // container.innerHTML = ''
           // container.appendChild(progress)
           // document.querySelector('#progress-container').style.display = 'none'
           // document.querySelector('#progress-container').style.display = 'block'
           // this.forceUpdate()

        })
      })

      Promise.all(promises)
        .then((val) => {
          console.log({ val })
          this.setState({
              animFrames: newFrames,
              width: svgs[0].plotWidth,
              height: svgs[0].plotHeight,
              loading: false
          })
        })
  }

  startAnimation(frames) {
    this.count = 0
    this.then = Date.now()
    this.drawPreview(frames)
  }

  drawPreview = frames => {

      requestAnimationFrame(() => this.drawPreview(frames))

      const now = Date.now()
      const elapsed = now - this.then
      if (elapsed <= 1000/30) return

      this.then = now - (elapsed % (1000/30))
      if (this.count === frames.length) {
        this.count = 0
      }
      const graph = new Graph('graph-0')
      const animFrame = frames[this.count]
      const bezierPoints = animFrame.coordinates.map(coord => (new Point(coord.x, animFrame.plotHeight - coord.y)))
      graph.clear()
      graph.drawCurveFromPoints(bezierPoints, `graph-${animFrame.frameNum}`)
      this.count++

  }

  onFramesUpload = files => {
      FILE_CACHE = []
      const totalLength = files.length
      const promises = files.map(file => (this.readFile(file, totalLength)))
      console.log({ promises })

      this.setState({
        loading: true,
        totalFrames: totalLength
      })

      Promise.all(promises)
        .then(() => {
          FILE_CACHE.sort((a, b) => a.num - b.num)
          // setTimeout(() => {
            this.setState({
              uploaded: true
            })
            this.loadFrames(FILE_CACHE.map(file => (file.data)))
          // }, 0)
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
    const frameNum = parseInt(name.match(/\d+/g)[0])
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
                <svg onLoad={this.startAnimation(animFrames)} width={`${animFrames[0].plotWidth}px`} height={`${animFrames[0].plotHeight}px`} id='graph-0'></svg>
                <a className={style.link} download={`frame_${0}.txt`} href={makeTextFile(animFrames)}>download coordinates</a>
              </div>
            )}

        </div>
    )
  }
}

export default hot(module)(App);
