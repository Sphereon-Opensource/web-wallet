import React, {FC, ReactElement} from 'react'

export type Props = {
  size?: number
  color?: string
}

const CrossIcon: FC<Props> = (props: Props): ReactElement => {
  const {size = 16, color = '#303030'} = props // TODO color

  return (
    <div style={{width: size, aspectRatio: 1, display: 'flex'}}>
      <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15.7658 0.234368C15.5276 -0.00391931 15.1413 -0.00388882 14.903 0.234368L8.0001 7.13727L1.09723 0.234406C0.858949 -0.00388207 0.472653 -0.00388207 0.234371 0.234406C-0.00390698 0.472663 -0.00390407 0.85896 0.234374 1.09725L7.13724 8.00011L0.234392 14.903C-0.00387689 15.1412 -0.00388589 15.5275 0.234389 15.7658C0.472671 16.0041 0.85898 16.0041 1.09725 15.7658L8.0001 8.86297L14.903 15.7658C15.1412 16.0041 15.5275 16.0041 15.7658 15.7658C16.0041 15.5276 16.0041 15.1413 15.7658 14.903L8.86296 8.00011L15.7658 1.09721C16.0041 0.858953 16.0041 0.472656 15.7658 0.234368Z"
          fill={color}
        />
      </svg>
    </div>
  )
}

export default CrossIcon
