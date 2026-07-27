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
      repositories(first: 10, orderBy: { field: PUSHED_AT, direction: DESC }, ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
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
 * Picks whichever repo actually has the newest default-branch commit,
 * among the 10 most recently pushed-to repos the user has access to —
 * owned, organization-member, or collaborator. `ownerAffiliations` (note
 * the plural — GitHub's actual GraphQL argument name; an earlier version
 * of this query used the singular `ownerAffiliation`, which isn't a real
 * argument and made every call fail validation, silently failing this
 * half of every GitHub widget refresh) deliberately matches the
 * contribution heatmap's broader scope (contributionsCollection counts
 * activity across all of those, not just owned repos).
 *
 * Querying `first: 10` (not 1) and re-sorting by `committedDate` here,
 * rather than trusting GraphQL's `PUSHED_AT` ordering directly: `pushedAt`
 * tracks pushes to *any* branch, not just the default branch, so a repo
 * that had a stale/off-branch push can outrank a repo with a genuinely
 * newer default-branch commit — showing an inactive repo as "latest
 * activity" instead of the one actually just worked on. Re-ranking a
 * small candidate window by the commit date we actually display fixes
 * that without an unbounded query.
 *
 * Returns null rather than throwing when there's no matching activity at
 * all (a real, non-error state, not worth failing the whole widget
 * refresh over).
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

  const candidates = (body.data?.viewer?.repositories?.nodes ?? [])
    .map((repo) => ({ repo, commit: repo?.defaultBranchRef?.target }))
    .filter(
      (
        candidate,
      ): candidate is {
        repo: { name: string; url: string };
        commit: { message: string; committedDate: string; url: string };
      } =>
        !!candidate.repo?.name &&
        !!candidate.repo.url &&
        !!candidate.commit?.message &&
        !!candidate.commit.committedDate &&
        !!candidate.commit.url,
    );

  const newest = candidates.sort(
    (a, b) => new Date(b.commit.committedDate).getTime() - new Date(a.commit.committedDate).getTime(),
  )[0];
  if (!newest) return null;

  return {
    repoName: newest.repo.name,
    repoUrl: newest.repo.url,
    commitMessage: newest.commit.message.split("\n")[0] ?? newest.commit.message,
    commitUrl: newest.commit.url,
    committedAt: newest.commit.committedDate,
  };
}
