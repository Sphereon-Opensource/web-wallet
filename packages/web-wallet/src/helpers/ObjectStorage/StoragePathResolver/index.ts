import {IStoragePathResolver} from '../types'
import {determinePath} from '../functions'

/**
 * Simple resolver to combine a bucket Id and combine a base path with a supplied path
 */
export class StoragePathResolver implements IStoragePathResolver {
  constructor(
    private readonly bucketId: string,
    private readonly basePath?: string,
  ) {}

  getBucketId(): string {
    return this.bucketId
  }

  getBasePath(): string {
    return this.basePath ?? ''
  }

  resolvePath(path?: string): string {
    return determinePath({bucketPath: this.basePath, optsPath: path})
  }
}
