import process from "node:process"
import { Agent } from "node:https"
import { Client } from "@notionhq/client"
import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints"
import type { Repo } from "./types"
import { get, save } from "./cache"

// TODO: add assertion
const databaseId = process.env.NOTION_DATABASE_ID as string

const NAMESPACE = "notion-page"

export class Notion {
  private notion!: Client
  private pages: Record<string, { id: string }> = {}
  private agent?: Agent

  reset() {
    if (this.agent) this.agent.destroy()
    this.agent = new Agent()
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
      agent: this.agent,
    })
  }

  constructor() {
    this.reset()
    this.pages = get(NAMESPACE, {})

    console.log(`Notion: restored from cache, count is ${Object.keys(this.pages).length}`)
  }

  save() {
    save(NAMESPACE, this.pages)
  }

  hasPage(name: string) {
    return !!this.pages[name]
  }

  /**
   * full-sync pages in database
   */
  async fullSyncIfNeeded() {
    if (Object.keys(this.pages).length) {
      console.log(`Notion: skipped sync due to cache`)
      return
    }

    console.log("Notion: Start to get all pages")

    let hasNext = true
    let cursor: string | undefined

    while (hasNext) {
      const database: QueryDatabaseResponse = await this.notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: cursor,
      })

      this.addPages(database.results)
      hasNext = database.has_more
      // @ts-expect-error type
      cursor = database.next_cursor
    }

    console.log(`Notion: Get all pages success, count is ${Object.keys(this.pages).length}`)

    this.save()
  }

  addPages(pages: any[]) {
    pages.forEach((page) => {
      this.pages[page.properties.Name.title[0].plain_text] = {
        id: page.id,
      }
    })

    this.save()
  }

  async insertPage(repo: Repo) {
    if (repo.description && repo.description.length >= 2000) {
      repo.description = `${repo.description.slice(0, 1200)}...`
    }
    const data = await this.notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        "Name": {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: repo.nameWithOwner,
              },
            },
          ],
        },
        "Type": {
          type: "select",
          select: {
            name: "Star",
          },
        },
        "Link": {
          type: "url",
          url: repo.url,
        },
        "Description": {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: repo.description || "",
              },
            },
          ],
        },
        "Primary Language": {
          type: "select",
          select: {
            name: repo?.primaryLanguage?.name || "null",
          },
        },
        "Repository Topics": {
          type: "multi_select",
          multi_select: repo.repositoryTopics || [],
        },
        "Starred At": {
          type: "date",
          date: {
            start: repo.starredAt,
          },
        },
      },
    })

    this.pages[repo.nameWithOwner] = { id: data.id }

    console.log(`insert page ${repo.nameWithOwner} success, page id is ${data.id}`)

    this.save()
  }
}

export const notion = new Notion()
