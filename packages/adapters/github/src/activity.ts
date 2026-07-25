export interface LatestActivity {
  repoName: string;
  repoUrl: string;
  commitMessage: string;
  commitUrl: string;
  committedAt: string;
}

interface GraphQLResponse {
  data?: {
    viewer?: {
      repositories?: {
        nodes?: {
          name?: string;
          url?: string;
          defaultBranchRef?: {
            target?: {
              message?: string;
              committedDate?: string;
              url?: string;
            };
          };
        }[];
      };
    };
  };
  errors?: { message?: string }[];
}

const LATEST_ACTIVITY_QUERY = `
  query {
    viewer {
      repositories(first: 1, orderBy: { field: PUSHED_AT, direction: DESC }, ownerAffiliation: OWNER) {
        nodes {
          name
          url
          defaultBranchRef {
            target {
              ... on Commit {
                message
                committedDate
                url
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Most recently pushed-to repo the user owns, plus its default branch's
 * latest commit — one query, used to fill out the GitHub card beyond the
 * contribution heatmap. Returns null rather than throwing when the user has
 * no owned repos yet (a real, non-error state, not worth failing the whole
 * widget refresh over).
 */
export async function fetchLatestActivity(accessToken: string): Promise<LatestActivity | null> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: LATEST_ACTIVITY_QUERY }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse;
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${body.errors[0]?.message ?? "unknown"}`);
  }

  const repo = body.data?.viewer?.repositories?.nodes?.[0];
  const commit = repo?.defaultBranchRef?.target;
  if (!repo?.name || !repo.url || !commit?.message || !commit.committedDate || !commit.url) {
    return null;
  }

  return {
    repoName: repo.name,
    repoUrl: repo.url,
    commitMessage: commit.message.split("\n")[0] ?? commit.message,
    commitUrl: commit.url,
    committedAt: commit.committedDate,
  };
}
