import process from "node:process"
import { partialSync } from "src/main"
import { expect, it } from "vitest"

it("env should be added", () => {
  const ENVS = ["NOTION_API_KEY", "NOTION_DATABASE_ID", "TOKEN_OF_GITHUB"]

  ENVS.forEach((env) => {
    expect(process.env[env]).toBeDefined()
  })
})

it("partial sync", async () => {
  await partialSync()
})
