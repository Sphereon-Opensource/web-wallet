import {FetchParameters, FileOptions, SearchOptions, StorageClient, TransformOptions} from '@supabase/storage-js'
import {supabaseServiceClient} from '../SupabaseClient'

import 'reflect-metadata'
import {objectStorageList} from './functions'
import {FileBody, IObjectCorrelation, IStoragePathResolver, StorageOptions} from './types'
import {ObjectCorrelation} from './ObjectCorrelation'

export class ObjectStorage {
  private readonly storageClient: StorageClient
  private readonly bucketId: string
  private readonly _resolver: IStoragePathResolver

  private constructor(resolver: IStoragePathResolver, args?: {storageClient?: StorageClient}) {
    this.storageClient = args?.storageClient ?? supabaseServiceClient.storage as StorageClient

    this._resolver = resolver
    this.bucketId = resolver.getBucketId()
  }

  public static fromResolver(
    resolver: IStoragePathResolver,
    args?: {storageOpts?: StorageOptions; storageClient?: StorageClient; createBucket?: boolean},
  ) {
    const storage = new ObjectStorage(resolver, args)
    storage
      .getBucket()
      .then(result => {
        if (result.error !== undefined && args?.createBucket === true) {
          void storage.createBucket()
        }
      })
      .catch(e => {
        console.log(e)
        void storage.createBucket()
      })
    return storage
  }

  public static fromCorrelation(
    correlation: IObjectCorrelation,
    args?: {storageOpts?: StorageOptions; storageClient?: StorageClient; createBucket?: boolean},
  ) {
    return ObjectStorage.fromResolver(ObjectCorrelation.fromCorrelation(correlation, args?.storageOpts), args)
  }

  public static fromObject(instance: any, args?: {storageOpts?: StorageOptions; storageClient?: StorageClient; createBucket?: boolean}) {
    return ObjectStorage.fromCorrelation(ObjectCorrelation.fromObject(instance, args?.storageOpts), args)
  }

  async getBucket() {
    return this.storageClient.getBucket(this.bucketId)
  }

  async createBucket() {
    let bucket
    try {
      bucket = await this.getBucket()
      if (bucket?.error) {
        const result = await this.storageClient.createBucket(this.bucketId)
        if (result.error) {
          console.log(result.error)
          throw result.error
        }
        bucket = await this.getBucket()
      }
    } catch (e) {
      console.log(e)
      const result = await this.storageClient.createBucket(this.bucketId)
      if (result.error) {
        console.log(result.error)
        throw result.error
      }
      bucket = await this.getBucket()
    }

    if (bucket?.error) {
      console.log(bucket?.error)
      throw bucket.error
    }

    return bucket
  }

  get resolver(): IStoragePathResolver {
    return this._resolver
  }

  async list(opts?: {path?: string; options?: SearchOptions; parameters?: FetchParameters; searchDepth?: number}) {
    return objectStorageList(this.storageClient, this.resolver, opts)
  }

  private fileApi() {
    return this.storageClient.from(this.bucketId)
  }

  async copy(fromPath: string, toPath: string) {
    const from = this.resolver.resolvePath(fromPath)
    const to = this.resolver.resolvePath(toPath)
    return this.fileApi().copy(from, to)
  }

  async move(fromPath: string, toPath: string) {
    const from = this.resolver.resolvePath(fromPath)
    const to = this.resolver.resolvePath(toPath)
    return this.fileApi().move(from, to)
  }

  async upload(path: string, fileBody: FileBody, fileOptions?: FileOptions) {
    return this.fileApi().upload(this.resolver.resolvePath(path), fileBody, fileOptions)
  }

  async update(path: string, fileBody: FileBody, fileOptions?: FileOptions) {
    return this.fileApi().update(this.resolver.resolvePath(path), fileBody, fileOptions)
  }

  async remove(paths: string | string[]) {
    const pathsArray = Array.isArray(paths) ? paths : [paths]
    return this.fileApi().remove(pathsArray.map(path => this.resolver.resolvePath(path)))
  }

  async download(path: string, opts?: {transform: TransformOptions}) {
    return this.fileApi().download(this.resolver.resolvePath(path), opts)
  }

  async createSignedUploadUrl(path: string) {
    return this.fileApi().createSignedUploadUrl(this.resolver.resolvePath(path))
  }

  async getSignedDownloadUrl(
    path: string,
    expiresIn: number,
    options?: {
      download?: string | boolean
      transform?: TransformOptions
    },
  ) {
    return this.fileApi().createSignedUrl(this.resolver.resolvePath(path), expiresIn, options)
  }
}
