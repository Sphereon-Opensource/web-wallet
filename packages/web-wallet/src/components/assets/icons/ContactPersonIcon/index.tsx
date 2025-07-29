import React, {CSSProperties, FC, ReactElement} from 'react'
import {fontColors} from '@sphereon/ui-components.core'

type Props = {
    size?: number
    color?: string
    style?: CSSProperties
}

const ContactPersonIcon: FC<Props> = (props: Props): ReactElement => {
    const {size = 18, color = fontColors.dark, style} = props
    const iconAspectRatio = 0.888888;
    const height = size / 16
    const width = iconAspectRatio * height

    return (
        <div style={{...style, width: `${width}rem`, height: `${height}rem`, display: 'flex'}}>
            <svg width="100%" height="100%" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M9 9.53418C10.2708 9.53418 12.2075 9.85467 13.8125 10.4922C14.6147 10.8108 15.3004 11.1953 15.7764 11.6309C16.2488 12.0632 16.4766 12.5082 16.4766 12.9688V15.4092H1.52344V12.9688C1.52344 12.5082 1.75214 12.0633 2.22461 11.6309C2.70048 11.1954 3.38556 10.8108 4.1875 10.4922C5.79241 9.85467 7.7291 9.53424 9 9.53418ZM9 0.59082C10.9206 0.59082 12.4687 2.13209 12.4688 4.02539C12.4688 5.91874 10.9206 7.45996 9 7.45996C7.07955 7.45977 5.53223 5.91863 5.53223 4.02539C5.53229 2.13221 7.07959 0.591008 9 0.59082Z"
                    stroke={color}
                    strokeWidth="1.08056"
                />
            </svg>
        </div>
    )
}

export default ContactPersonIcon
