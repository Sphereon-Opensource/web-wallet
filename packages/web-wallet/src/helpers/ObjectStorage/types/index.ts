export type FileBody =
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | Buffer
  | File
  | FormData
  | NodeJS.ReadableStream
  | ReadableStream<Uint8Array>
  | URLSearchParams
  | string

export enum ObjectStorageMode {
  SINGLE_BUCKET = 'sb',
  BUCKET_PER_CLASS = 'bc',
  BUCKET_PER_OBJECT = 'bo',
}

export enum StorageCorrelationType {
  ID = 'i',
  NAME = 'n',
}

export interface StorageOptions {
  storageMode: ObjectStorageMode
}

export interface CorrelationId {
  // pointer: JsonPointer
  property: string
  value: string
}

export interface IObjectCorrelation {
  className: string
  correlation: CorrelationId
  type: StorageCorrelationType
}

export interface IStoragePathResolver {
  getBucketId(): string

  getBasePath(): string

  resolvePath(path?: string): string
}
