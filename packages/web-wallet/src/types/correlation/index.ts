const correlationKey = Symbol('custom:storage:object')

export function storage(info: {className: string; idField: string}): ClassDecorator {
  return target => Reflect.defineMetadata(correlationKey, info, target)
}

export function getStorageObjectDecorator(instance: object) {
  return Reflect.getOwnMetadata(correlationKey, instance.constructor)
}
