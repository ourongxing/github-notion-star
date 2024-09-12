import assert from "node:assert"
import process from "node:process"
import { github } from "./github"
import { notion } from "./notion"

export async function fullSync() {
  await Promise.all([github.fullSync(), notion.fullSyncIfNeeded()])

  for (const repo of github.repoList) {
    if (!notion.hasPage(repo.nameWithOwner)) {
      try {
        await notion.insertPage(repo)
      } catch (e: any) {
        const errorText = e.toString()
        if (
          errorText.includes("PgPoolWaitConnectionTimeout")
          || errorText.includes("Request timed out")
          || errorText.includes("Request to Notion API has timed out")
          || errorText.includes("Request to Notion API failed with status: 502")
        ) {
          notion.reset()
          await notion.insertPage(repo)
        }
      }
    }
  }
}

export async function partialSync() {
  await Promise.all([github.getList(), notion.fullSyncIfNeeded()])

  for (const repo of github.repoList.reverse()) {
    if (notion.hasPage(repo.nameWithOwner)) {
      console.log(`Skip saved page ${repo.nameWithOwner}`)
      continue
    }

    await notion.insertPage(repo)
  }
}

const ENVS = ["NOTION_API_KEY", "NOTION_DATABASE_ID", "TOKEN_OF_GITHUB"]

ENVS.forEach((env) => {
  assert(process.env[env], `${env} must be added`)
})

if (process.env.FULL_SYNC) {
  fullSync()
} else {
  partialSync()
}
