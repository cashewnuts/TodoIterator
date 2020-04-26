import React from 'react'

const GdriveIcon = (props: {
  fontSize?: 'small' | 'medium' | 'large' | number
}) => {
  const { fontSize } = props
  let wh = 0
  switch (fontSize) {
    case 'small':
      wh = 20
      break
    case 'medium':
      wh = 24
      break
    case 'large':
      wh = 30
      break
    default:
      if (typeof fontSize === 'number') {
        wh = fontSize
      } else {
        wh = 24
      }
      break
  }
  return (
    <svg
      width={wh}
      height={wh}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 133156 115341"
    >
      <g>
        <polygon
          style={{ fill: '#3777E3' }}
          points="22194,115341 44385,76894 133156,76894 110963,115341"
        />
        <polygon
          style={{ fill: '#FFCF63' }}
          points="88772,76894 133156,76894 88772,0 44385,0"
        />
        <polygon
          style={{ fill: '#11A861' }}
          points="0,76894 22194,115341 66578,38447 44385,0"
        />
      </g>
    </svg>
  )
}

export default GdriveIcon
