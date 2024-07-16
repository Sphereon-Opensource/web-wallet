import {getStorageObjectDecorator} from '@typings'
import {CorrelationId, IObjectCorrelation, IStoragePathResolver, StorageCorrelationType, StorageOptions} from '../types'
import {StoragePathResolver} from '../StoragePathResolver'
import {determineRoot, getCorrelationValue} from '../functions'

export class ObjectCorrelation extends StoragePathResolver implements IObjectCorrelation, IStoragePathResolver {
  public readonly className: string
  public readonly correlation: CorrelationId
  public readonly type: StorageCorrelationType

  constructor(correlation: IObjectCorrelation, opts?: StorageOptions) {
    const value = getCorrelationValue(correlation)
    const root = determineRoot(correlation, opts)
    super(root.bucket, root.path)
    this.className = value.className
    this.correlation = correlation.correlation
    this.type = StorageCorrelationType.ID
  }

  static fromCorrelation(correlation: IObjectCorrelation, opts?: StorageOptions) {
    return new ObjectCorrelation(correlation, opts)
  }

  static fromObject(instance: any, opts?: StorageOptions) {
    const decorator = getStorageObjectDecorator(instance)
    const className = decorator.className
    const idField = decorator.idField ?? ('id' in instance ? instance.id : undefined)
    if (!idField) {
      throw Error(`Could not determine id field for class ${className}`)
    }
    const idValue = instance[idField]
    if (!idValue) {
      throw Error(
        `Class '${className}' with id field '${idField}' did not contain a value or was not accessible (private). Cannot find storage if we do not have an id`,
      )
    }

    const correlation: IObjectCorrelation = {
      className,
      correlation: {
        property: idField,
        value: idValue,
      },
      type: StorageCorrelationType.ID,
    }
    return ObjectCorrelation.fromCorrelation(correlation, opts)
  }
}
