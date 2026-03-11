"use client";

import React from 'react'

const Hero = () => {
  return (
    <>
      <div className="bg-black h-screen p-32">
        <div className="bg-red-200 h-full p-32">
          <div className="bg-yellow-200 h-full justify-between flex">
            <div className="bg-green-500 w-1/3"></div>
            <div className="bg-green-900 w-1/3"></div>
          </div>
        </div>
      </div>
    </>
  )
}
export default Hero;