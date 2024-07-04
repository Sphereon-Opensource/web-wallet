import React, {FC, ReactElement} from 'react'

export type Props = {
  width?: number
  height?: number
  color?: string
}

const DocumentIcon: FC<Props> = (props: Props): ReactElement => {
  const {width = 28, height = 38, color = '#303030'} = props // TODO color

  return (
    <div style={{width, height, display: 'flex'}}>
      <svg width="100%" height="100%" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M26.8828 7.409L21.4423 1.677C20.8054 1.006 19.6456 0.5 18.7458 0.5H17.5593H13.7627H3.32203C1.49064 0.5 0 2.0705 0 4V34C0 35.9295 1.49064 37.5 3.32203 37.5H24.678C26.5094 37.5 28 35.9295 28 34V19V11.5V10.25C28 9.3015 27.5197 8.08 26.8828 7.409ZM24.7643 8.0045C24.7349 8.004 24.7074 8 24.678 8H22.3051C21.5201 8 20.8814 7.327 20.8814 6.5V4C20.8814 3.9695 20.8776 3.94 20.8771 3.9095L24.7643 8.0045ZM26.1017 34C26.1017 34.827 25.4629 35.5 24.678 35.5H3.32203C2.53708 35.5 1.89831 34.827 1.89831 34V4C1.89831 3.173 2.53708 2.5 3.32203 2.5H13.7627H17.5593C18.3443 2.5 18.9831 3.173 18.9831 4V6.5C18.9831 8.4295 20.4737 10 22.3051 10H24.678C25.4629 10 26.1017 10.673 26.1017 11.5V19V34Z"
          fill={color}
        />
      </svg>
    </div>
  )
}

export default DocumentIcon
