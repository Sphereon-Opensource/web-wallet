import React, {FC, ReactElement} from 'react'

export type Props = {
  width?: number
  height?: number
  color?: string
}

const MoreIcon: FC<Props> = (props: Props): ReactElement => {
  const {width = 18, height = 6, color = '#303030'} = props // TODO color

  return (
    <div style={{width, height, display: 'flex'}}>
      <svg width="100%" height="100%" viewBox="0 0 18 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2.25 0.51593C1.0125 0.51593 0 1.52843 0 2.76593C0 4.00343 1.0125 5.01593 2.25 5.01593C3.4875 5.01593 4.5 4.00343 4.5 2.76593C4.5 1.52843 3.4875 0.51593 2.25 0.51593ZM15.75 0.51593C14.5125 0.51593 13.5 1.52843 13.5 2.76593C13.5 4.00343 14.5125 5.01593 15.75 5.01593C16.9875 5.01593 18 4.00343 18 2.76593C18 1.52843 16.9875 0.51593 15.75 0.51593ZM9 0.51593C7.7625 0.51593 6.75 1.52843 6.75 2.76593C6.75 4.00343 7.7625 5.01593 9 5.01593C10.2375 5.01593 11.25 4.00343 11.25 2.76593C11.25 1.52843 10.2375 0.51593 9 0.51593Z"
          fill={color}
        />
      </svg>
    </div>
  )
}

export default MoreIcon
