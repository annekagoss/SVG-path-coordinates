import React, { Component } from 'react'
import classNames from 'classnames'
import Dropzone from 'react-dropzone'
import styles from './index.css'

export default class DropZone extends Component {
  onDrop = (acceptedFiles, rejectedFiles) => {
    console.log({ acceptedFiles, rejectedFiles })
  }

  render() {
    return (
      <Dropzone onDrop={this.onDrop}>
        {({getRootProps, getInputProps, isDragActive}) => {
          return (
            <div
              {...getRootProps()}
              className={classNames(styles.dropzone, {'dropzone--isActive': isDragActive})}
            >
              <input {...getInputProps()} />
              {
                isDragActive ?
                  <p>Drop files here...</p> :
                  <p>Try dropping some files here, or click to select files to upload.</p>
              }
            </div>
          )
        }}
      </Dropzone>
    )
  }
}
