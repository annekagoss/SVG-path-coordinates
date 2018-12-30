import React, { Component } from 'react'
import classNames from 'classnames'
import style from './index.css'

export default class ProgressBar extends Component {
  render() {
    const { loadedFrames, totalFrames } = this.props
    const fillStyle = {
      right: `${(1-parseInt(loadedFrames/totalFrames))*100}%`
    }
    return (
      <div  className={style.progress}>
        <div className={style.bar}>
          <div className={style.fill} style={fillStyle}></div>
        </div>
        <div id='progress-container' className={style.text}>
          <div id='progress'>{loadedFrames} / {totalFrames}</div>
        </div>
      </div>
    )
  }
}
