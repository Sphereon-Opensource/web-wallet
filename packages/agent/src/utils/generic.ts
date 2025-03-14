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
    try {
      let typeName = fileName.match(/(^.*?)\.json/)
      if (typeName) {
        const name = typeName[1]
        names.push(name)
        files.push(fileName)
        const object = JSON.parse(fs.readFileSync(`${path}/${fileName}`, 'utf8').toString()) as T
        asObject[name] = object
        asArray.push(object)
      }
    } catch (e) {
      throw Error(`${(e as Error).message} for file ${path}/${fileName}`, {cause: e})
    }
  })
  return { names, fileNames: files, asObject, asArray }
}


/**
 * Loads one or more JSON files from a path into a map.
 *
 * @param path The path to search for files with .json extension
 */
export function loadJsonFileMap<T>({path}: {path: string}): Record<string, T> {
  if (!fs.existsSync(path)) {
    console.log(`WARN: Path ${path} does not exist. Will not load json files`)
    return {}
  }

  const fileMap: Record<string, T> = {}
  const fileNames = fs.readdirSync(path).filter(file => file.match(/\.json$/))

  fileNames.forEach(fileName => {
    try {
      const match = fileName.match(/^(.*?)\.json$/)
      if (match) {
        const baseName = match[1]
        fileMap[baseName] = JSON.parse(fs.readFileSync(`${path}/${fileName}`, 'utf8')) as T
      }
    } catch (e) {
      throw Error(`${(e as Error).message} for file ${path}/${fileName}`, {cause: e})
    }
  })

  return fileMap
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
