export function deleteUndefinedProps(instance: Record<string, any>) {
  Object.keys(instance).forEach(key => {
    if (instance[key] === undefined) {
      delete instance[key]
    }
  })
}

export type TranslateFn = {
  (key: string, options?: any, defaultMessage?: string): string
  (key: string, defaultMessage?: string): string
}
