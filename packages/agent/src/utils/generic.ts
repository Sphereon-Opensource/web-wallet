import * as fs from 'fs'

/**
 * Loads one or more JSON files from a path.
 *
 * @param path The path to search for files with .json extension
 */
export function loadJsonFiles<T>({ path }: { path: string }): {
  names: string[]
  fileNames: string[]
  asObject: Record<string, T>
  asArray: T[]
} {
  if (!fs.existsSync(path)) {
    console.log(`WARN: Path ${path} does not exist. Will not load json files`)
    return { names: [], fileNames: [], asArray: [], asObject: {} }
  }
  // Note we restrict files to .json extension. Do not remove as the method has no guards for the path, meaning it could have security consequences
  const fileNames = fs.readdirSync(path).filter((file) => file.match(/\.json$/))
  const names: string[] = []
  const files: string[] = []
  const asObject: Record<string, T> = {}
  const asArray: T[] = []

  fileNames.forEach((fileName: string) => {
    let typeName = fileName.match(/(^.*?)\.json/)
    if (typeName) {
      const name = typeName[1]
      names.push(name)
      files.push(fileName)
      const object = JSON.parse(fs.readFileSync(`${path}/${fileName}`, 'utf8').toString()) as T
      asObject[name] = object
      asArray.push(object)
    }
  })
  return { names, fileNames: files, asObject, asArray }
}

/**
 * The function builds a file path without missing or excess slashes
 * @param segments
 */
export function normalizeFilePath(...segments: (string | null | undefined)[]): string {
  let result = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    if (segment !== null && segment !== undefined && segment !== '') {
      if (i === 0) {
        // For the first non-null and non-empty segment, remove the trailing slash if it exists
        result += segment.replace(/\/$/, '')
      } else {
        // For subsequent segments, ensure all slashes are present
        result += `/${segment.replace(/^\//, '').replace(/\/$/, '')}`
      }
    }
  }
  return result
}
