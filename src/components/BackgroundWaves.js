import React from 'react'
import './BackgroundWaves.scss'

const BackgroundWaves = () => {
  return (
    <div className="background-anim-container">
      <div className="box">
        <div className="wave -one"></div>
        <div className="wave -two"></div>
        <div className="wave -three"></div>
      </div>
    </div>
  )
}

export default BackgroundWaves