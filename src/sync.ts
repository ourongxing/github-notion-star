import { github } from "./github"
import { notion } from "./notion"
import { delay } from "./utils"

// github repolist 的顺序是从新到旧
export async function fullSync() {
  await Promise.all([github.fetchFull(), notion.fetchFull()])

  for (const repo of github.repoList.toReversed()) {
    if (!notion.hasPage(repo.id)) {
      try {
        await notion.insertPage(repo)
        await delay(200)
      } catch (e: any) {
        const errorText = e.toString()
        if (
          errorText.includes("PgPoolWaitConnectionTimeout")
          || errorText.includes("Request timed out")
          || errorText.includes("Request to Notion API has timed out")
          || errorText.includes("Request to Notion API failed with status: 502")
        ) {
          notion.reset()
          console.log("Notion: reset agent and retry")
          // 好像不用重试，是执行完了但是没有返回结果。最好还是重试，然后最后去重一下
          await notion.insertPage(repo)
        } else {
          console.log(`Notion: insert ${repo.nameWithOwner} failed`)
          console.log(e)
        }
      }
    }
  }
}

export async function partialSync() {
  await Promise.all([github.fetchLatest(), notion.fetchFull()])

  for (const repo of github.repoList.toReversed()) {
    if (notion.hasPage(repo.id)) {
      console.log(`Skip saved page ${repo.nameWithOwner}`)
      continue
    }

    await notion.insertPage(repo)
  }
}

/**
 * 所谓双向同步，自然是在 notion 里添加 github 里新 star 的 repo, 再 unstar notion 里删除的 repo。同时还要更新 notion 里的 repo 数据，防止改名
 * 重点就是从新到久的顺序，依次往 notion 里添加，直到出现 notion 里已有的 repo，就切换模式，开始在 github 里 unstar noton 里删除的 repo。
 */
export async function biSync() {
  await Promise.all([github.fetchFull(), notion.fetchFull()])
  // 只添加最近的 notion 里没有的 repo
  for (const repo of github.repoList) {
    const pageId = notion.hasPage(repo.id)
    if (!pageId) {
      await notion.insertPage(repo)
    } else {
      break
    }
  }
  for (const repo of github.repoList) {
    const pageId = notion.hasPage(repo.id)
    if (!pageId) {
      await github.unstar(repo)
    } else if (notion.needUpdate(repo)) {
      await notion.updatePage(pageId, repo)
    }
  }
}
