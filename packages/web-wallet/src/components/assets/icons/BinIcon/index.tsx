import React, {CSSProperties, FC, ReactElement} from 'react'
import {fontColors} from '@sphereon/ui-components.core'

export type Props = {
  width?: number
  height?: number
  color?: string
  style?: CSSProperties
}

const BinIcon: FC<Props> = (props: Props): ReactElement => {
  const {width = 22, height = 24, color = fontColors.lightGrey, style} = props

  return (
    <div style={{width, height, ...style}}>
      <svg width="100%" height="100%" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="Group">
          <path
            id="Vector"
            d="M19.8279 4.98905V20.6058C19.8279 22.4672 18.3115 24 16.4701 24H5.53385C3.68887 24 2.17245 22.4672 2.17245 20.6058V4.98905H0.977362C-0.0588603 4.98905 -0.0588603 3.39781 0.977362 3.39781H7.11165V1.87226C7.11165 0.875912 7.88431 0 8.89165 0H13.1124C14.1161 0 14.8923 0.879562 14.8923 1.87226V3.39781H21.023C22.0593 3.39781 22.0593 4.98905 21.023 4.98905H19.8279ZM8.68585 3.39781H13.3145V1.87226C13.3145 1.75547 13.2459 1.59124 13.1124 1.59124H8.89165C8.75445 1.59124 8.68585 1.75547 8.68585 1.87226V3.39781ZM14.4302 17.9635C14.4302 19.0073 12.856 19.0073 12.856 17.9635V9.29927C12.856 8.25547 14.4302 8.25547 14.4302 9.29927V17.9635ZM9.14438 17.9635C9.14438 19.0073 7.57019 19.0073 7.57019 17.9635V9.29927C7.57019 8.25547 9.14438 8.25182 9.14438 9.29927V17.9635ZM18.2537 4.98905C13.4192 4.98905 8.58475 4.98905 3.75025 4.98905V20.6058C3.75025 21.5985 4.54818 22.4088 5.53385 22.4088H16.4701C17.4522 22.4088 18.2537 21.5985 18.2537 20.6058V4.98905Z"
            fill={color}
          />
        </g>
      </svg>
    </div>
  )
}

export default BinIcon
