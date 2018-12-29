import React, { Component } from 'react'
import classNames from 'classnames'
import Dropzone from 'react-dropzone'
import style from './index.css'

export default class DropZone extends Component {
  onDrop = (acceptedFiles, rejectedFiles) => {
    rejectedFiles.length > 0 && console.error(new Error(`${rejectedFiles.length} frames were rejected`))
    acceptedFiles.length > 0 && this.props.onFramesUpload(acceptedFiles)
  }

  render() {
    return (
      <Dropzone onDrop={this.onDrop}>
        {({getRootProps, getInputProps, isDragActive}) => {
          return (
            <div
              {...getRootProps()}
              className={classNames(style.dropzone, {'dropzone--isActive': isDragActive})}
            >
              <input {...getInputProps()} />
              <div className={style.label}>
                <div>Drop SVG frames here.</div>
              </div>
            </div>
          )
        }}
      </Dropzone>
    )
  }
}
