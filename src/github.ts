import process from "node:process"
import { Octokit } from "@octokit/core"
import type { GithubRepositoryTopic, QueryForStarredRepository, Repo, RepositoryTopic } from "./types"
import { delay } from "./utils"

// @ts-expect-error type error
const githubTopicsFirst = +process.env.REPO_TOPICS_LIMIT || 50

const QL = `
                            pageInfo {
                                startCursor
                                endCursor
                                hasNextPage
                            }
                            edges {
                                starredAt
                                node {
                                    id
                                    isFork
                                    isEmpty
                                    isArchived
                                    isMirror
                                    isDisabled
                                    isPrivate
                                    isLocked
                                    nameWithOwner
                                    url
                                    description
                                    primaryLanguage {
                                        name
                                    }
                                    repositoryTopics(first: $topicFirst) {
                                        nodes {
                                            topic {
                                                name
                                            }
                                        }
                                    }
                                    updatedAt
                                }
                            }
`
export class Github {
  private client: Octokit

  constructor() {
    this.client = new Octokit({
      auth: process.env.TOKEN_OF_GITHUB,
    })
  }

  repoList: Repo[] = []

  async fetchFull() {
    const limit = +(process.env.FULLSYNC_LIMIT || 2000)
    console.log(`Github: Start to get all starred repos, limit is ${limit}`)

    let cursor = ""
    let hasNextPage = true
    const repoList = []

    while (hasNextPage && repoList.length < limit) {
      const data = await this.getStarredRepoAfterCursor(cursor, githubTopicsFirst)
      repoList.push(
        ...this.transformGithubStarResponse(data),
      )

      hasNextPage = data.starredRepositories.pageInfo.hasNextPage
      cursor = data.starredRepositories.pageInfo.endCursor
      await delay(100)
    }

    this.repoList = repoList

    console.log(`Github: Get all starred repos success, count is ${this.repoList.length}`)
  }

  async unstar(repo: Repo) {
    await this.client.request(`DELETE /user/starred/${repo.nameWithOwner}`, {})
    console.log(`Github: Unstar ${repo.nameWithOwner} success`)
  }

  async fetchLatest() {
    const limit = +(process.env.PARTIALSYNC_LIMIT || 10)

    console.log(`Github: Start to sync latest starred repos, limit is ${limit}`)

    const data = await this.getLastStarredRepo(limit, githubTopicsFirst)
    this.repoList.push(
      ...this.transformGithubStarResponse(data),
    )
  }

  private transformGithubStarResponse(data: QueryForStarredRepository): Repo[] {
    return (data.starredRepositories.edges || []).map(({ node, starredAt }) => ({
      ...node,
      starredAt,
      repositoryTopics: (node?.repositoryTopics?.nodes || []).map(
        (o: GithubRepositoryTopic): RepositoryTopic => ({ name: o?.topic?.name }),
      ),
    }))
  }

  private async getStarredRepoAfterCursor(cursor: string, topicFirst: number) {
    const data = await this.client.graphql<{ viewer: QueryForStarredRepository }>(
      `query ($after: String, $topicFirst: Int) {
                    viewer {
                        starredRepositories(after: $after, orderBy: {field: STARRED_AT, direction: DESC}) {
                            ${QL}
                        }
                    }
                }`,
      {
        after: cursor,
        topicFirst,
      },
    )

    return data.viewer
  }

  private async getLastStarredRepo(limit: number, topicFirst: number) {
    const data = await this.client.graphql<{ viewer: QueryForStarredRepository }>(
      ` query ($limit: Int, $topicFirst: Int) {
                    viewer {
                        starredRepositories(first: $limit, orderBy: {field: STARRED_AT, direction: DESC}) {
                            ${QL}
                        }
                    }
                } `,
      {
        limit,
        topicFirst,
      },
    )

    return data.viewer
  }
}

export const github = new Github()
