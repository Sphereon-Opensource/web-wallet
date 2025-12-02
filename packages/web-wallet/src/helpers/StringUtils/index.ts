export const isNonEmptyString = (input?: string): boolean => {
  return !!input && input.trim().length > 0
}

export const camelToSnakeCase = (str: string) => str.replace(/(?<!^)[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`)

export const toCamelCase = (str: string): string => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (m) => m.toLowerCase())
}

export const toPascalCase = (str: string): string => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (m) => m.toUpperCase())
}

