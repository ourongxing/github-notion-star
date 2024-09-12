import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"

const CACHE_DIR = fileURLToPath(new URL("../.cache", import.meta.url))

function getCacheFilePath(key: string) {
  return path.join(CACHE_DIR, `./${key}.json`)
}

export function save<T extends Record<string, any>>(key: string, data: T) {
  const dataString = JSON.stringify(data)
  fs.ensureDirSync(CACHE_DIR)
  fs.writeFileSync(getCacheFilePath(key), dataString)
}

export function get<T extends Record<string, any>>(key: string, defaultValue: T): T {
  try {
    const dataString = fs.readFileSync(getCacheFilePath(key), "utf-8") || ""
    return JSON.parse(dataString) as T
  } catch {
    console.log("Notion: error from recover cache")
    return defaultValue as T
  }
}
