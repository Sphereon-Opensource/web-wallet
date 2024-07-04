export const isNonEmptyString = (input?: string): boolean => {
  return !!input && input.trim().length > 0
}

export const camelToSnakeCase = (str: string) => str.replace(/(?<!^)[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)
