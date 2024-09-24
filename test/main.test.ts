import process from "node:process"
import { github } from "src/github"
import { Notion } from "src/notion"
import { biSync } from "src/sync"
import { expect, it } from "vitest"

it("env should be added", () => {
  const ENVS = ["NOTION_API_KEY", "NOTION_DATABASE_ID", "TOKEN_OF_GITHUB"]

  ENVS.forEach((env) => {
    expect(process.env[env]).toBeDefined()
  })
})

it.skip("bi sync", { timeout: 600000 }, async () => {
  await biSync()
})

it.skip("last 10 repos", async () => {
  await github.fetchLatest()
  expect(github.repoList.slice(0, 2)).toMatchInlineSnapshot(`
    [
      {
        "description": "💅 Beautiful Changelogs using Conventional Commits",
        "id": "R_kgDOHRXIJQ",
        "isArchived": false,
        "isDisabled": false,
        "isEmpty": false,
        "isFork": false,
        "isLocked": false,
        "isMirror": false,
        "isPrivate": false,
        "nameWithOwner": "unjs/changelogen",
        "primaryLanguage": {
          "name": "TypeScript",
        },
        "repositoryTopics": [],
        "starredAt": "2024-09-19T17:14:03Z",
        "updatedAt": "2024-09-20T12:32:24Z",
        "url": "https://github.com/unjs/changelogen",
      },
      {
        "description": "Greenlight is an open-source client for xCloud and Xbox home streaming made in Typescript.",
        "id": "MDEwOlJlcG9zaXRvcnkzODY3NTI5NTk=",
        "isArchived": false,
        "isDisabled": false,
        "isEmpty": false,
        "isFork": false,
        "isLocked": false,
        "isMirror": false,
        "isPrivate": false,
        "nameWithOwner": "unknownskl/greenlight",
        "primaryLanguage": {
          "name": "TypeScript",
        },
        "repositoryTopics": [
          {
            "name": "streaming",
          },
          {
            "name": "xbox",
          },
          {
            "name": "xcloud",
          },
        ],
        "starredAt": "2024-09-17T11:31:45Z",
        "updatedAt": "2024-09-20T00:18:42Z",
        "url": "https://github.com/unknownskl/greenlight",
      },
    ]
  `)
})

it.skip("full sync", { timeout: 600000 }, async () => {
  await github.fetchFull()
  expect(github.repoList).toMatchFileSnapshot("github-full-sync.json")
})

it.skip("fetch full notion page", { timeout: 600000 }, async () => {
  const notion = new Notion()
  await notion.fetchFull()
})
