import * as fs from "fs";

/**
 * Loads one or more JSON files from a path.
 *
 * @param path The path to search for files with .json extension
 */
export function loadJsonFiles<T>({ path }: { path: string }): {
  names: string[];
  fileNames: string[];
  asObject: Record<string, T>;
  asArray: T[];
} {
  if (!fs.existsSync(path)) {
    console.log(`WARN: Path ${path} does not exist. Will not load json files`);
    return { names: [], fileNames: [], asArray: [], asObject: {} };
  }
  // Note we restrict files to .json extension. Do not remove as the method has no guards for the path, meaning it could have security consequences
  const fileNames = fs
    .readdirSync(path)
    .filter((file) => file.match(/\.json$/));
  const names: string[] = [];
  const files: string[] = [];
  const asObject: Record<string, T> = {};
  const asArray: T[] = [];

  fileNames.forEach((fileName: string) => {
    let typeName = fileName.match(/(^.*?)\.json/);
    if (typeName) {
      const name = typeName[1];
      names.push(name);
      files.push(fileName);
      const object = JSON.parse(
        fs.readFileSync(`${path}/${fileName}`, "utf8").toString(),
      ) as T;
      asObject[name] = object;
      asArray.push(object);
    }
  });
  return { names, fileNames: files, asObject, asArray };
}
