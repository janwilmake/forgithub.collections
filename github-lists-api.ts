/**
 * Simplified GitHub Lists API
 *
 * This file contains essential CRUD operations for GitHub lists and list items
 * using the standard GitHub API with a personal access token.
 */

// Types for GitHub GraphQL responses
interface GitHubListItem {
  __typename: string;
  name: string;
  url: string;
  isPrivate: boolean;
  description: string | null;
  stargazerCount: number;
  owner: { login: string };
}

interface GitHubList {
  name: string;
  description: string | null;
  isPrivate: boolean;
  lastAddedAt: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  items: {
    totalCount: number;
    nodes: GitHubListItem[];
  };
}

export interface FormattedGitHubList {
  name: string;
  description: string | null;
  isPrivate: boolean;
  slug: string;
  createdAt: string;
  updatedAt: string;
  lastAddedAt: string | null;
  totalRepositories: number;
  repositories: {
    name: string;
    url: string;
    isPrivate: boolean;
    description: string | null;
    stars: number;
    owner: string;
  }[];
}

export interface FormattedResponse {
  username: string;
  totalLists: number;
  lists: FormattedGitHubList[];
}

export interface Repo {
  id: number;
  name: string;
  owner: { login: string; id: number };
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  private: boolean;
}

export async function fetchAllMyRepos(
  token: string,
  owner: string,
  page = 1,
  allRepos: Repo[] = [],
): Promise<{ repos?: Repo[]; status: number }> {
  const response = await fetch(
    `https://api.github.com/user/repos?page=${page}&per_page=100&sort=updated`,
    {
      headers: {
        Authorization: `token ${token}`,
      },
    },
  );
  if (!response.ok) {
    console.log("notok", await response.text());
    return { status: response.status };
  }

  const newRepos: Repo[] = await response.json();
  allRepos = allRepos.concat(newRepos);

  if (newRepos.length === 100) {
    return fetchAllMyRepos(token, owner, page + 1, allRepos);
  } else {
    return { status: 200, repos: allRepos };
  }
}

export async function fetchAllMyStarredRepos(
  token: string,
  owner: string,
  page = 1,
  allRepos: Repo[] = [],
): Promise<{ repos?: Repo[]; status: number }> {
  const response = await fetch(
    `https://api.github.com/user/starred?page=${page}&per_page=100&sort=updated`,
    {
      headers: { Authorization: `token ${token}` },
    },
  );

  if (!response.ok) {
    console.log("notok", await response.text());
    return { status: response.status };
  }

  const newRepos: Repo[] = await response.json();
  allRepos = allRepos.concat(newRepos);

  if (newRepos.length === 100) {
    return fetchAllMyStarredRepos(token, owner, page + 1, allRepos);
  } else {
    return { status: 200, repos: allRepos };
  }
}
/**
 * Fetches all GitHub lists and their repositories for a given user
 *
 * @param username - GitHub username
 * @param token - GitHub Personal Access Token
 * @returns Formatted data containing lists and repositories
 */
export async function fetchGitHubLists(
  username: string,
  token: string,
): Promise<FormattedResponse> {
  if (!username) {
    throw new Error("Missing GitHub username parameter");
  }

  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  try {
    // Create the GraphQL query
    const query = `
        query {
          user(login: "${username}") {
            lists(first: 100) {
              totalCount
              nodes {
                name
                description
                isPrivate
                lastAddedAt
                slug
                createdAt
                updatedAt
                items(first: 100) {
                  totalCount
                  nodes {
                    __typename
                    ... on Repository {
                      name
                      url
                      isPrivate
                      description
                      stargazerCount
                      owner { login }
                    }
                  }
                }
              }
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    if (!data.data?.user?.lists) {
      throw new Error("GitHub API returned unexpected data structure");
    }

    // Format the response
    const formattedData: FormattedResponse = {
      username,
      totalLists: data.data.user.lists.totalCount,
      lists: data.data.user.lists.nodes.map((list: GitHubList) => {
        return {
          name: list.name,
          description: list.description,
          isPrivate: list.isPrivate,
          slug: list.slug,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          lastAddedAt: list.lastAddedAt,
          totalRepositories: list.items.totalCount,
          repositories: list.items.nodes
            .filter((item) => item.__typename === "Repository")
            .map((repo) => {
              return {
                name: repo.name,
                url: repo.url,
                isPrivate: repo.isPrivate,
                description: repo.description,
                stars: repo.stargazerCount,
                owner: repo.owner.login,
              };
            }),
        };
      }),
    };

    return formattedData;
  } catch (error) {
    console.error("Error fetching GitHub lists:", error);
    throw error;
  }
}

/**
 * Creates a new GitHub user list
 *
 * @param token - GitHub Personal Access Token
 * @param name - Name of the list to create
 * @param description - Description of the list (optional)
 * @param isPrivate - Whether the list should be public (default: true)
 * @returns The newly created list data
 */
export async function createGitHubList(
  token: string,
  name: string,
  description?: string,
  isPrivate: boolean = true,
): Promise<any> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  try {
    // Create the GraphQL mutation
    const mutation = `
        mutation {
          createUserList(input: {
            name: "${name}",
            description: ${description ? `"${description}"` : "null"},
            isPrivate: ${isPrivate}
          }) {
            list {
              id
              name
              description
              isPrivate
              slug
              createdAt
              updatedAt
            }
            viewer {
              login
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data.data.createUserList;
  } catch (error) {
    console.error("Error creating GitHub list:", error);
    throw error;
  }
}

/**
 * Updates an existing GitHub user list
 *
 * @param token - GitHub Personal Access Token
 * @param listId - ID of the list to update
 * @param name - New name for the list (optional)
 * @param description - New description for the list (optional)
 * @param isPrivate - New visibility setting for the list (optional)
 * @returns The updated list data
 */
export async function updateGitHubList(
  token: string,
  listId: string,
  name?: string,
  description?: string,
  isPrivate?: boolean,
): Promise<any> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  if (!listId) {
    throw new Error("Missing list ID parameter");
  }

  try {
    // Build input object with only provided parameters
    const inputParams: string[] = [];
    if (name !== undefined) inputParams.push(`name: "${name}"`);
    if (description !== undefined)
      inputParams.push(
        `description: ${description ? `"${description}"` : "null"}`,
      );
    if (isPrivate !== undefined) inputParams.push(`isPrivate: ${isPrivate}`);

    // Create the GraphQL mutation
    const mutation = `
        mutation {
          updateUserList(input: {
            listId: "${listId}",
            ${inputParams.join(",")}
          }) {
            list {
              id
              name
              description
              isPrivate
              slug
              updatedAt
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data.data.updateUserList;
  } catch (error) {
    console.error("Error updating GitHub list:", error);
    throw error;
  }
}

/**
 * Deletes a GitHub user list
 *
 * @param token - GitHub Personal Access Token
 * @param listId - ID of the list to delete
 * @returns The result of the deletion operation
 */
export async function deleteGitHubList(
  token: string,
  listId: string,
): Promise<any> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  if (!listId) {
    throw new Error("Missing list ID parameter");
  }

  try {
    // Create the GraphQL mutation
    const mutation = `
        mutation {
          deleteUserList(input: {
            listId: "${listId}"
          }) {
            user {
              login
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data.data.deleteUserList;
  } catch (error) {
    console.error("Error deleting GitHub list:", error);
    throw error;
  }
}

/**
 * Gets the Node ID for a repository (needed for list operations)
 *
 * @param token - GitHub Personal Access Token
 * @param owner - Owner of the repository
 * @param name - Name of the repository
 * @returns The Node ID of the repository
 */
export async function getRepositoryNodeId(
  token: string,
  owner: string,
  name: string,
): Promise<string> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  if (!owner || !name) {
    throw new Error("Missing repository owner or name parameter");
  }

  try {
    // Create the GraphQL query
    const query = `
        query {
          repository(owner: "${owner}", name: "${name}") {
            id
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    if (!data.data?.repository?.id) {
      throw new Error("Repository not found or ID not available");
    }

    return data.data.repository.id;
  } catch (error) {
    console.error("Error getting repository Node ID:", error);
    throw error;
  }
}

/**
 * Adds a repository to one or more GitHub lists
 *
 * @param token - GitHub Personal Access Token
 * @param repositoryId - ID of the repository to add
 * @param listIds - Array of list IDs to add the repository to
 * @returns The result of the operation
 */
export async function addRepoToGitHubLists(
  token: string,
  repositoryId: string,
  listIds: string[],
): Promise<any> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  if (!repositoryId) {
    throw new Error("Missing repository ID parameter");
  }

  if (!listIds || listIds.length === 0) {
    throw new Error("Missing list IDs parameter");
  }

  try {
    // Create the GraphQL mutation
    const mutation = `
        mutation {
          updateUserListsForItem(input: {
            itemId: "${repositoryId}",
            listIds: [${listIds.map((id) => `"${id}"`).join(", ")}]
          }) {
            lists {
              id
              name
              description
            }
            item {
              ... on Repository {
                name
                url
                isPrivate
                description
                stargazerCount
                owner {
                  login
                }
              }
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data.data.updateUserListsForItem;
  } catch (error) {
    console.error("Error adding repository to GitHub lists:", error);
    throw error;
  }
}

/**
 * Removes a repository from one or more GitHub lists
 * This is done by updating the repository's lists and omitting the lists to remove from
 *
 * @param token - GitHub Personal Access Token
 * @param repositoryId - ID of the repository
 * @param currentListIds - All list IDs the repository currently belongs to
 * @param listsToRemoveFrom - List IDs to remove the repository from
 * @returns The result of the operation
 */
export async function removeRepoFromGitHubLists(
  token: string,
  repositoryId: string,
  currentListIds: string[],
  listsToRemoveFrom: string[],
): Promise<any> {
  if (!token) {
    throw new Error("Missing GitHub token parameter");
  }

  if (!repositoryId) {
    throw new Error("Missing repository ID parameter");
  }

  if (!currentListIds || !listsToRemoveFrom) {
    throw new Error("Missing list IDs parameters");
  }

  // Filter out the lists we want to remove the repo from
  const updatedListIds = currentListIds.filter(
    (id) => !listsToRemoveFrom.includes(id),
  );

  try {
    // Create the GraphQL mutation
    const mutation = `
        mutation {
          updateUserListsForItem(input: {
            itemId: "${repositoryId}",
            listIds: [${updatedListIds.map((id) => `"${id}"`).join(", ")}]
          }) {
            lists {
              id
              name
              description
            }
            item {
              ... on Repository {
                name
                url
              }
            }
          }
        }
      `;

    // Make the GraphQL request to GitHub's API
    const endpoint = "https://api.github.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}): ${errorText}`,
      );
    }

    // Parse the response
    const data = await response.json();

    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }

    return data.data.updateUserListsForItem;
  } catch (error) {
    console.error("Error removing repository from GitHub lists:", error);
    throw error;
  }
}
