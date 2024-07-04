import React, {FC, ReactElement} from 'react'

export interface IProps {
  width?: number
  height?: number
  color?: string
}

const ContactIcon: FC<IProps> = (props: IProps): ReactElement => {
  const {width = 20, height = 21, color = '#303030'} = props // TODO color

  return (
    <div style={{width, height, display: 'flex'}}>
      <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.80871 5.64223C5.80871 3.35606 7.67768 1.49303 10 1.49303C12.3223 1.49303 14.1913 3.35606 14.1913 5.64223C14.1913 7.92841 12.3223 9.79144 10 9.79144C7.67768 9.79144 5.80871 7.92841 5.80871 5.64223ZM0.808706 16.7975C0.808706 16.2729 1.06729 15.7519 1.63914 15.2285C2.21621 14.7004 3.05453 14.228 4.04699 13.8338C6.03291 13.0449 8.43145 12.6483 10 12.6483C11.5686 12.6483 13.9671 13.0449 15.953 13.8338C16.9455 14.228 17.7838 14.7004 18.3609 15.2285C18.9327 15.7519 19.1913 16.2729 19.1913 16.7975V19.7073H0.808706V16.7975Z"
          stroke={color}
          strokeOpacity="0.8"
          strokeWidth="1.61741"
        />
      </svg>
    </div>
  )
}

export default ContactIcon
