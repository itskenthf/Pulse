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
      repositories(first: 1, orderBy: { field: PUSHED_AT, direction: DESC }, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
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
 * Most recently pushed-to repo the user has access to — owned,
 * organization-member, or collaborator — plus its default branch's latest
 * commit. `ownerAffiliations` (note the plural — GitHub's actual GraphQL
 * argument name; an earlier version of this query used the singular
 * `ownerAffiliation`, which isn't a real argument and made every call fail
 * validation, silently failing this half of every GitHub widget refresh)
 * deliberately matches the contribution heatmap's broader scope
 * (contributionsCollection counts activity across all of those, not just
 * owned repos). Returns null rather than throwing when there's no matching
 * activity at all (a real, non-error state, not worth failing the whole
 * widget refresh over).
 */
export async function fetchLatestActivity(
  accessToken: string,
  signal?: AbortSignal,
): Promise<LatestActivity | null> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: LATEST_ACTIVITY_QUERY }),
    cache: "no-store",
    signal,
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
