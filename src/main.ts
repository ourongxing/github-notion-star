import assert from "node:assert"
import process from "node:process"
import { biSync, fullSync, partialSync } from "./sync"

const ENVS = ["NOTION_API_KEY", "NOTION_DATABASE_ID", "TOKEN_OF_GITHUB"]

ENVS.forEach((env) => {
  assert(process.env[env], `${env} must be added`)
})

if (process.env.FULL_SYNC) {
  fullSync()
} else if (process.env.BI_SYNC) {
  biSync()
} else {
  partialSync()
}
