import {downloadImage, getImageDimensions, IImageDimensions} from '@sphereon/ssi-sdk.core'

export const getImageSizes = async (url: string): Promise<IImageDimensions | undefined> => {
  const resource = await downloadImage(url)
  if (resource) {
    return getImageDimensions(resource?.base64Content)
  }
}
