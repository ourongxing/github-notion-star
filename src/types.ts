import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints"

export interface RepositoryTopic {
  name: string
}

export interface GithubRepositoryTopic {
  topic: RepositoryTopic
}

export interface GithubRepositoryTopicConnection {
  nodes: GithubRepositoryTopic[]
}

export interface Language {
  name: string
}

export interface RepoBase {
  id: string
  isFork: boolean
  isEmpty: boolean
  isArchived: boolean
  isDisabled: boolean
  isMirror: boolean
  isPrivate: boolean
  isLocked: boolean
  nameWithOwner: string
  url: string
  description: string
  starredAt: string
  primaryLanguage: Language
  updatedAt: string
}

export interface Repo extends RepoBase {
  repositoryTopics: RepositoryTopic[]
}

export interface GithubStarRepoNode extends RepoBase {
  repositoryTopics: GithubRepositoryTopicConnection
}

export interface QueryForStarredRepository {
  starredRepositories: {
    pageInfo: {
      startCursor: string
      endCursor: string
      hasNextPage: boolean
    }
    edges: Array<{
      starredAt: string
      node: GithubStarRepoNode
    }>
  }
}

export interface NotionPage extends QueryDatabaseResponse {
}
