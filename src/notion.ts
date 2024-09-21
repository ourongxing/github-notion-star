import process from "node:process"
import { Agent } from "node:https"
import { Client } from "@notionhq/client"
import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints"
import type { Repo } from "./types"
import { get, save } from "./cache"
import { delay } from "./utils"

// TODO: add assertion
const databaseId = process.env.NOTION_DATABASE_ID as string

const NAMESPACE = "notion-page"

export class Notion {
  private notion!: Client
  private pages: Record<string, { title: string, id: string }> = {}
  private agent?: Agent
  repoList: string[] = []

  reset() {
    if (this.agent) this.agent.destroy()
    this.agent = new Agent()
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
      agent: this.agent,
      timeoutMs: 10000,
    })
  }

  constructor() {
    this.reset()
    if (process.env.BI_SYNC || process.env.FULL_SYNC) {
      this.pages = {}
      console.log(`Notion: drop cache`)
    } else {
      this.pages = get(NAMESPACE, {})
      console.log(`Notion: restored from cache, count is ${Object.keys(this.pages).length}`)
    }
  }

  /**
   * 只会在 cache 里添加新数据
   */
  save() {
    save(NAMESPACE, this.pages)
    this.repoList = Object.keys(this.pages)
  }

  hasPage(id: string) {
    return this.pages?.[id]?.id
  }

  needUpdate(repo: Repo) {
    return !!this.pages[repo.id] && this.pages[repo.id].title !== repo.nameWithOwner
  }

  /**
   * full-sync pages in database
   */
  async fetchFull() {
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
        sorts: [{
          timestamp: "last_edited_time",
          direction: "ascending",
        }],
      })

      for (const page of database.results) {
        const props = (page as any).properties
        const id = props.ID.rich_text[0].plain_text
        const title = props.Name.title[0].plain_text
        if (this.pages[id]) {
          console.log("Notion: del duplicate page")
          await this.delPage(this.pages[id].id)
        }
        this.pages[id] = {
          id: page.id,
          title,
        }
      }

      hasNext = database.has_more
      // @ts-expect-error type
      cursor = database.next_cursor
      await delay(200)
    }

    console.log(`Notion: Get all pages success, count is ${Object.keys(this.pages).length}`)

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
        "Status": {
          type: "multi_select",
          multi_select: Object.entries(repo)
            .filter(([k, v]) => k.startsWith("is") && v === true)
            .map(([k, _]) => ({
              name: k.slice(2),
            })),
        },
        "Starred At": {
          type: "date",
          date: {
            start: repo.starredAt,
          },
        },
        "ID": {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: repo.id,
              },
            },
          ],
        },
      },
    })

    this.pages[repo.id] = { id: data.id, title: repo.nameWithOwner }

    console.log(`insert page ${repo.nameWithOwner} successful!\npage url is ${(data as any).url}`)

    this.save()
  }

  async updatePage(pageId: string, repo: Repo) {
    if (repo.description && repo.description.length >= 2000) {
      repo.description = `${repo.description.slice(0, 1200)}...`
    }
    const data = await this.notion.pages.update({
      page_id: pageId,
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
        "Status": {
          type: "multi_select",
          multi_select: Object.entries(repo)
            .filter(([k, v]) => k.startsWith("is") && v === true)
            .map(([k, _]) => ({
              name: k.slice(2),
            })),
        },
        "Starred At": {
          type: "date",
          date: {
            start: repo.starredAt,
          },
        },
        "ID": {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: repo.id,
              },
            },
          ],
        },
      },
    })

    this.pages[repo.id] = { id: data.id, title: repo.nameWithOwner }

    console.log(`update page ${repo.nameWithOwner} successful!\npage url is ${(data as any).url}`)

    this.save()
  }

  async delPage(pageId: string) {
    await this.notion.pages.update({
      page_id: pageId,
      archived: true,
    })
  }
}

export const notion = new Notion()
