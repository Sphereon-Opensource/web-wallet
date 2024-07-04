import React, {FC, ReactElement} from 'react'

export interface IProps {
  width?: number
  height?: number
  color?: string
}

const AssetIcon: FC<IProps> = (props: IProps): ReactElement => {
  const {width = 20, height = 19, color = '#303030'} = props // TODO color "url(#paint0_linear_918_27866)"

  return (
    <div style={{width, height, display: 'flex'}}>
      <svg width="100%" height="100%" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1.05263 0.808706H18.9474C19.0797 0.808706 19.1913 0.92032 19.1913 1.05263V7.36842C19.1913 7.50073 19.0797 7.61235 18.9474 7.61235H1.05263C0.92032 7.61235 0.808706 7.50073 0.808706 7.36842V1.05263C0.808706 0.92032 0.92032 0.808706 1.05263 0.808706ZM1.05263 11.335H18.9474C19.0797 11.335 19.1913 11.4466 19.1913 11.5789V17.8947C19.1913 18.0271 19.0797 18.1387 18.9474 18.1387H1.05263C0.92032 18.1387 0.808706 18.0271 0.808706 17.8947V11.5789C0.808706 11.4466 0.92032 11.335 1.05263 11.335Z"
          stroke={color}
          strokeOpacity="0.8"
          strokeWidth="1.61741"
        />
      </svg>
    </div>
  )
}

export default AssetIcon
