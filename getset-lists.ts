import {
  fetchGitHubLists,
  fetchAllMyRepos,
  fetchAllMyStarredRepos,
  FormattedGitHubList,
  createGitHubList,
  updateGitHubList,
  deleteGitHubList,
  getRepositoryNodeId,
  addRepoToGitHubLists,
  removeRepoFromGitHubLists,
} from "./github-lists-api";

export interface GithubListsState {
  lists: {
    [listName: string]: {
      description: string | null;
      isPrivate?: boolean; // Optional in the interface to allow for omission when false
      items: string[];
    };
  };
  "repos-unlisted": string[];
  "starred-unlisted": string[];
}

/**
 * Fetches and organizes GitHub lists, repositories, and starred repositories
 *
 * @param username - GitHub username
 * @param token - GitHub Personal Access Token
 * @returns Formatted data containing lists, unlisted repositories, and unlisted starred repositories
 */
export async function getGitHubListsAndUnlistedRepos(
  username: string,
  token: string,
): Promise<GithubListsState> {
  try {
    // Fetch all data in parallel
    const [listsData, reposData, starredReposData] = await Promise.all([
      fetchGitHubLists(username, token),
      fetchAllMyRepos(token, username),
      fetchAllMyStarredRepos(token, username),
    ]);

    // Extract repositories and starred repositories
    const myRepos = reposData.repos || [];
    const myStarredRepos = starredReposData.repos || [];

    // Create a map of all repositories in lists for quick lookup
    const reposInLists = new Set<string>();
    listsData.lists.forEach((list) => {
      list.repositories.forEach((repo) => {
        reposInLists.add(`${repo.owner}/${repo.name}`);
      });
    });

    // Find repositories that aren't in any list
    const unlistedRepos = myRepos
      .filter((repo) => !reposInLists.has(`${repo.owner.login}/${repo.name}`))
      .map((repo) => `${repo.owner.login}/${repo.name}`);

    // Find starred repositories that aren't in any list
    const unlistedStarredRepos = myStarredRepos
      .filter((repo) => !reposInLists.has(`${repo.owner.login}/${repo.name}`))
      .map((repo) => `${repo.owner.login}/${repo.name}`);

    // Format the lists data as requested
    const formattedLists: {
      [listName: string]: {
        description: string | null;
        isPrivate?: boolean;
        items: string[];
      };
    } = {};

    listsData.lists.forEach((list) => {
      formattedLists[list.name] = {
        description: list.description,
        // Only include isPrivate field if it's true
        ...(list.isPrivate ? { isPrivate: true } : {}),
        items: list.repositories.map((repo) => `${repo.owner}/${repo.name}`),
      };
    });

    // Combine everything into the requested format
    const result: GithubListsState = {
      lists: formattedLists,
      "repos-unlisted": unlistedRepos,
      "starred-unlisted": unlistedStarredRepos,
    };

    return result;
  } catch (error) {
    console.error("Error getting GitHub lists and unlisted repos:", error);
    throw error;
  }
}

// Example usage:
// const githubData = await getGitHubListsAndUnlistedRepos(
//   "janwilmake",
//   //@ts-ignore
//   process.env.PAT,
// );
// console.log(JSON.stringify(githubData, null, 2));

interface UpdateListsResult {
  created: string[];
  updated: string[];
  deleted: string[];
  repoAdditions: number;
  repoRemovals: number;
  errors: string[];
}

/**
 * Updates GitHub lists to match the provided state
 *
 * This function:
 * 1. Creates lists that don't exist
 * 2. Updates descriptions of existing lists
 * 3. Removes lists that aren't in the target state
 * 4. Updates repository memberships in lists
 *
 * It minimizes API calls by batching operations and only making changes when needed.
 *
 * @param username - GitHub username
 * @param token - GitHub Personal Access Token
 * @param targetState - The desired state for GitHub lists
 * @returns A summary of changes made
 */
export async function updateGitHubListsState(
  username: string,
  token: string,
  targetState: GithubListsState,
): Promise<UpdateListsResult> {
  const result: UpdateListsResult = {
    created: [],
    updated: [],
    deleted: [],
    repoAdditions: 0,
    repoRemovals: 0,
    errors: [],
  };

  try {
    // Step 1: Fetch current state of GitHub lists
    const currentState = await fetchGitHubLists(username, token);

    // Create maps for easier lookup
    const currentListsMap = new Map<string, FormattedGitHubList>();
    currentState.lists.forEach((list) => {
      currentListsMap.set(list.name, list);
    });

    // Create a map of repository node IDs for quicker processing later
    const repoNodeIdCache = new Map<string, string>();

    // Step 2: Create, update, and delete lists as needed

    // Lists to create (in target but not in current)
    const listsToCreate = Object.keys(targetState.lists).filter(
      (listName) => !currentListsMap.has(listName),
    );

    // Lists to update (in both target and current)
    const listsToUpdate = Object.keys(targetState.lists).filter((listName) => {
      if (!currentListsMap.has(listName)) return false;
      const currentList = currentListsMap.get(listName)!;
      const targetList = targetState.lists[listName];

      // Check if description is different
      const descriptionChanged =
        currentList.description !== targetList.description;

      // Check if privacy setting is different
      // Default isPrivate to false if not specified in target list
      const targetIsPrivate = targetList.isPrivate ?? false;
      const privacyChanged = currentList.isPrivate !== targetIsPrivate;

      return descriptionChanged || privacyChanged;
    });

    // Lists to delete (in current but not in target)
    const listsToDelete = Array.from(currentListsMap.keys()).filter(
      (listName) => !targetState.lists[listName],
    );

    // Create lists
    for (const listName of listsToCreate) {
      try {
        // Default isPrivate to false if not specified
        const isPrivate = targetState.lists[listName].isPrivate ?? false;

        await createGitHubList(
          token,
          listName,
          targetState.lists[listName].description || undefined,
          isPrivate,
        );
        result.created.push(listName);
      } catch (error) {
        result.errors.push(`Failed to create list ${listName}: ${error}`);
      }
    }

    // Update lists
    for (const listName of listsToUpdate) {
      try {
        const listId = currentListsMap.get(listName)?.slug;
        if (!listId) continue;

        // Default isPrivate to false if not specified
        const isPrivate = targetState.lists[listName].isPrivate ?? false;

        await updateGitHubList(
          token,
          listId,
          undefined, // don't change name
          targetState.lists[listName].description || undefined,
          isPrivate,
        );
        result.updated.push(listName);
      } catch (error) {
        result.errors.push(`Failed to update list ${listName}: ${error}`);
      }
    }

    // Delete lists
    for (const listName of listsToDelete) {
      try {
        const listId = currentListsMap.get(listName)?.slug;
        if (!listId) continue;

        await deleteGitHubList(token, listId);
        result.deleted.push(listName);
      } catch (error) {
        result.errors.push(`Failed to delete list ${listName}: ${error}`);
      }
    }

    // Step 3: Fetch updated lists after creating/updating/deleting
    // This ensures we have the latest list IDs for the repository operations
    const updatedState = await fetchGitHubLists(username, token);
    const updatedListsMap = new Map<string, FormattedGitHubList>();
    updatedState.lists.forEach((list) => {
      updatedListsMap.set(list.name, list);
    });

    // Step 4: Update repository memberships in lists

    // Build list ID lookup map for easier reference
    const listIdByName = new Map<string, string>();
    updatedState.lists.forEach((list) => {
      listIdByName.set(list.name, list.slug);
    });

    // Build map of current repos in each list
    const currentReposInList = new Map<string, Set<string>>();
    updatedState.lists.forEach((list) => {
      const repoSet = new Set<string>();
      list.repositories.forEach((repo) => {
        repoSet.add(`${repo.owner}/${repo.name}`);
      });
      currentReposInList.set(list.name, repoSet);
    });

    // For each list in the target state, add/remove repos as needed
    for (const [listName, listData] of Object.entries(targetState.lists)) {
      const listId = listIdByName.get(listName);
      if (!listId) {
        result.errors.push(`Could not find ID for list ${listName}`);
        continue;
      }

      const currentRepos =
        currentReposInList.get(listName) || new Set<string>();
      const targetRepos = new Set(listData.items);

      // Find repos to add (in target but not current)
      const reposToAdd = Array.from(targetRepos).filter(
        (repo) => !currentRepos.has(repo),
      );

      // Find repos to remove (in current but not target)
      const reposToRemove = Array.from(currentRepos).filter(
        (repo) => !targetRepos.has(repo),
      );

      // Process repo additions
      for (const repo of reposToAdd) {
        try {
          const [owner, repoName] = repo.split("/");

          // Get or cache repository node ID
          if (!repoNodeIdCache.has(repo)) {
            const nodeId = await getRepositoryNodeId(token, owner, repoName);
            repoNodeIdCache.set(repo, nodeId);
          }
          const repoId = repoNodeIdCache.get(repo);

          if (!repoId) {
            result.errors.push(`Could not get node ID for repo ${repo}`);
            continue;
          }

          await addRepoToGitHubLists(token, repoId, [listId]);
          result.repoAdditions++;
        } catch (error) {
          result.errors.push(
            `Failed to add repo ${repo} to list ${listName}: ${error}`,
          );
        }
      }

      // Process repo removals
      for (const repo of reposToRemove) {
        try {
          const [owner, repoName] = repo.split("/");

          // Get or cache repository node ID
          if (!repoNodeIdCache.has(repo)) {
            const nodeId = await getRepositoryNodeId(token, owner, repoName);
            repoNodeIdCache.set(repo, nodeId);
          }
          const repoId = repoNodeIdCache.get(repo);

          if (!repoId) {
            result.errors.push(`Could not get node ID for repo ${repo}`);
            continue;
          }

          // Get all lists this repo is currently in
          const currentListIds: string[] = [];
          updatedState.lists.forEach((list) => {
            const hasRepo = list.repositories.some(
              (r) => `${r.owner}/${r.name}` === repo,
            );
            if (hasRepo) {
              currentListIds.push(list.slug);
            }
          });

          await removeRepoFromGitHubLists(token, repoId, currentListIds, [
            listId,
          ]);
          result.repoRemovals++;
        } catch (error) {
          result.errors.push(
            `Failed to remove repo ${repo} from list ${listName}: ${error}`,
          );
        }
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`General error updating GitHub lists: ${error}`);
    return result;
  }
}

// Example usage:
// const result = await updateGitHubListsState('yourusername', 'your-token', targetState);
// console.log(JSON.stringify(result, null, 2));
