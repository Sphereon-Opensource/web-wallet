import {FetchParameters, FileObject, SearchOptions, StorageClient} from '@supabase/storage-js'
import {storage} from '@typings'
import {IObjectCorrelation, IStoragePathResolver, ObjectStorageMode, StorageCorrelationType, StorageOptions} from '../types'
import {WF_BUCKET_STORAGE_ID} from '@components/views/WorkflowApproveDocuments'

/**
 * Gets the root folders belonging to a certain object. These could be the root folders of a single bucket, or subfolders in a single bucket for multiple objects.
 *
 * Support to configure how these folders should be resolved will be made available in a future release. For now we will use a bucket per object, where the bucket name will be comprised of the className.objectId
 *
 * @param storageClient
 * @param correlation
 */
export function objectStorageFileApi(storageClient: StorageClient, resolver: IStoragePathResolver, opts?: {path?: string}) {
  const path = resolver.resolvePath(opts?.path)
  return {api: storageClient.from(resolver.getBucketId()), path}
}

export function determinePath(args?: {bucketPath?: string; optsPath?: string}) {
  if (!args?.optsPath) {
    return args?.bucketPath ?? '' // bucket path never ends with a slash, since we generate the path
  } else if (!args?.bucketPath) {
    if (args?.optsPath && args.optsPath.startsWith('/')) {
      return args.optsPath.substring(1)
    }
    return args?.optsPath ?? ''
  } else {
    if (args.optsPath.startsWith('/')) {
      return `${args.bucketPath}${args.optsPath}`
    }
    return `${args.bucketPath}/${args.optsPath}`
  }
}

export async function objectStorageList(
  storageClient: StorageClient,
  resolver: IStoragePathResolver,
  opts?: {
    path?: string
    options?: SearchOptions
    parameters?: FetchParameters
    searchDepth?: number // TODO DPP-82 needs further implementation, -1 is infinite, 0 is root, 1 is 1 level deep, etc
  },
) {
  const {api, path} = objectStorageFileApi(storageClient, resolver)
  const finalPath = resolver.resolvePath(opts?.path)

  const result = await api.list(finalPath, opts?.options, opts?.parameters)

  if (result.error || opts?.searchDepth === undefined) {
    return result
  }

  const items: Array<FileObject> = result.data || []
  const files: Array<FileObject> = []
  for (const item of items) {
    if (item.id === null) {
      // FIXME this does not yet work if a basePath has been used on the StoragePathResolver
      const result: any = await objectStorageList(storageClient, resolver, {...opts, path: `${finalPath}/${item.name}`})
      if (result.error) {
        return result
      }
      files.push(...result.data)
    } else {
      files.push(item)
    }
  }

  return {data: files, error: null}
}

@storage({idField: 'myfield', className: 'Test'})
export class Test {
  constructor() {}

  private _myfield: string = 'fieldExample'

  get myfield(): string {
    return this._myfield
  }
}

function assertValidCorrelation(objectCorrelation: IObjectCorrelation) {
  if (!objectCorrelation || !objectCorrelation.correlation) {
    throw Error(`Not correlation object provided`)
  } else if (!objectCorrelation.correlation.value && !objectCorrelation.correlation.property) {
    throw Error('No correlation id or name provided')
  } else if (!objectCorrelation.className) {
    throw Error(`No class value provided for correlation value: ${objectCorrelation.correlation.value}`)
  }
}

export function getCorrelationValue(objectCorrelation: IObjectCorrelation): {
  value: string
  className: string
  type: StorageCorrelationType
} {
  assertValidCorrelation(objectCorrelation)
  let type = objectCorrelation.type
  let value = objectCorrelation.correlation.value
  if (type === StorageCorrelationType.NAME || (value === undefined && !type)) {
    type = StorageCorrelationType.NAME
  }

  if (!value) {
    throw Error('No value could be determined based on the name or the id')
  }
  return {value, className: objectCorrelation.className, type}
}

/**
 * Support to configure how these folders should be resolved will be made available in a future release. For now we will use a bucket per object, where the bucket name will be comprised of the className.objectId
 * @param correlation
 */
export function determineRoot(correlation: IObjectCorrelation, opts?: StorageOptions) {
  const {value, className, type} = getCorrelationValue(correlation)
  const mode = opts?.storageMode ?? ObjectStorageMode.SINGLE_BUCKET
  switch (mode) {
    case ObjectStorageMode.BUCKET_PER_OBJECT:
      return {bucket: `${className.toLowerCase()}.${value.toLowerCase()}`}
    case ObjectStorageMode.BUCKET_PER_CLASS:
      return {bucket: className.toLowerCase(), path: value.toLowerCase()}
    case ObjectStorageMode.SINGLE_BUCKET: {
      return {
        bucket: process.env.SINGLE_BUCKET_FILE_STORAGE_NAME ?? WF_BUCKET_STORAGE_ID,
        path: `${className.toLowerCase()}/${value.toLowerCase()}`,
      }
    }
  }
}
