/**
 * Manual Tests for GitHub Lists API
 *
 * This file contains simple tests to verify that the GitHub Lists API functions
 * are working correctly. It doesn't use any testing libraries.
 *
 * To run:
 * 1. Replace YOUR_GITHUB_TOKEN and YOUR_GITHUB_USERNAME with your actual values
 * 2. Execute with: ts-node github-lists-api-tests.ts
 */

import {
  fetchGitHubLists,
  createGitHubList,
  updateGitHubList,
  deleteGitHubList,
  getRepositoryNodeId,
  addRepoToGitHubLists,
  removeRepoFromGitHubLists,
  FormattedResponse,
} from "./github-lists-api"; // Update with correct path

// Configuration (replace with your actual values)
//@ts-ignore
const GITHUB_TOKEN = process.env.PAT;
const GITHUB_USERNAME = "janwilmake";
const TEST_REPO_OWNER = "microsoft"; // Example repo owner
const TEST_REPO_NAME = "TypeScript"; // Example repo name
console.log({ GITHUB_TOKEN, GITHUB_USERNAME });
// Test result tracking
let passedTests = 0;
let failedTests = 0;
let createdListId: string | null = null;

// Helper function to assert conditions
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failedTests++;
  }
}

// Helper to log test start
function startTest(name: string): void {
  console.log(`\n🧪 STARTING TEST: ${name}`);
}

// Test the fetchGitHubLists function
async function testFetchGitHubLists(): Promise<void> {
  startTest("fetchGitHubLists");

  try {
    const result = await fetchGitHubLists(GITHUB_USERNAME, GITHUB_TOKEN);

    assert(result !== null, "Result should not be null");
    assert(typeof result === "object", "Result should be an object");
    assert(
      result.username === GITHUB_USERNAME,
      "Username in result should match input",
    );
    assert(Array.isArray(result.lists), "Lists should be an array");
    assert(
      typeof result.totalLists === "number",
      "Total lists should be a number",
    );

    console.log(`Found ${result.totalLists} lists for user ${result.username}`);

    if (result.lists.length > 0) {
      const firstList = result.lists[0];
      console.log(
        `Example list: ${firstList.name} with ${firstList.totalRepositories} repositories`,
      );
    }
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Test the createGitHubList function
async function testCreateGitHubList(): Promise<void> {
  startTest("createGitHubList");

  const testListName = `Test List ${Date.now()}`;
  const testDescription = "This is a test list created by the API test script";

  try {
    const result = await createGitHubList(
      GITHUB_TOKEN,
      testListName,
      testDescription,
      true,
    );

    assert(result !== null, "Result should not be null");
    assert(result.list !== null, "List should be created");
    assert(result.list.name === testListName, "List name should match");
    assert(
      result.list.description === testDescription,
      "List description should match",
    );

    // Store the list ID for later tests
    createdListId = result.list.id;
    console.log(
      `Created new list: ${result.list.name} with ID: ${createdListId}`,
    );
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Test the updateGitHubList function
async function testUpdateGitHubList(): Promise<void> {
  startTest("updateGitHubList");

  if (!createdListId) {
    assert(false, "No list ID available for update test");
    return;
  }

  const updatedName = `Updated Test List ${Date.now()}`;
  const updatedDescription = "This list was updated by the API test script";

  try {
    const result = await updateGitHubList(
      GITHUB_TOKEN,
      createdListId,
      updatedName,
      updatedDescription,
    );

    assert(result !== null, "Result should not be null");
    assert(result.list !== null, "Updated list should be returned");
    assert(result.list.name === updatedName, "List name should be updated");
    assert(
      result.list.description === updatedDescription,
      "List description should be updated",
    );

    console.log(`Updated list name to: ${result.list.name}`);
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Test the getRepositoryNodeId function
async function testGetRepositoryNodeId(): Promise<string | null> {
  startTest("getRepositoryNodeId");

  try {
    const repoId = await getRepositoryNodeId(
      GITHUB_TOKEN,
      TEST_REPO_OWNER,
      TEST_REPO_NAME,
    );

    assert(repoId !== null, "Repository ID should not be null");
    assert(typeof repoId === "string", "Repository ID should be a string");
    assert(
      repoId.startsWith("MDEwOlJlcG9zaXRvcnk"),
      "Repository ID should have correct format",
    );

    console.log(
      `Found repository ID: ${repoId} for ${TEST_REPO_OWNER}/${TEST_REPO_NAME}`,
    );
    return repoId;
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

// Test the addRepoToGitHubLists function
async function testAddRepoToGitHubLists(repoId: string): Promise<void> {
  startTest("addRepoToGitHubLists");

  if (!createdListId) {
    assert(false, "No list ID available for adding repo test");
    return;
  }

  if (!repoId) {
    assert(false, "No repository ID available for adding repo test");
    return;
  }

  try {
    const result = await addRepoToGitHubLists(GITHUB_TOKEN, repoId, [
      createdListId,
    ]);

    assert(result !== null, "Result should not be null");
    assert(Array.isArray(result.lists), "Lists should be returned as an array");
    assert(result.lists.length > 0, "At least one list should be returned");
    assert(result.item !== null, "Item should be returned");
    assert(result.item.name === TEST_REPO_NAME, "Repository name should match");

    console.log(
      `Added ${TEST_REPO_OWNER}/${TEST_REPO_NAME} to list: ${result.lists[0].name}`,
    );
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Test the removeRepoFromGitHubLists function
async function testRemoveRepoFromGitHubLists(repoId: string): Promise<void> {
  startTest("removeRepoFromGitHubLists");

  if (!createdListId) {
    assert(false, "No list ID available for removing repo test");
    return;
  }

  if (!repoId) {
    assert(false, "No repository ID available for removing repo test");
    return;
  }

  try {
    // First, get all lists the repo is currently in
    // For this simple test, we'll assume the repo is only in our test list
    const currentListIds = [createdListId];

    const result = await removeRepoFromGitHubLists(
      GITHUB_TOKEN,
      repoId,
      currentListIds,
      [createdListId],
    );

    assert(result !== null, "Result should not be null");
    assert(Array.isArray(result.lists), "Lists should be returned as an array");
    assert(result.lists.length === 0, "No lists should remain after removal");
    assert(result.item !== null, "Item should be returned");
    assert(result.item.name === TEST_REPO_NAME, "Repository name should match");

    console.log(`Removed ${TEST_REPO_OWNER}/${TEST_REPO_NAME} from test list`);
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Test the deleteGitHubList function
async function testDeleteGitHubList(): Promise<void> {
  startTest("deleteGitHubList");

  if (!createdListId) {
    assert(false, "No list ID available for delete test");
    return;
  }

  try {
    const result = await deleteGitHubList(GITHUB_TOKEN, createdListId);

    assert(result !== null, "Result should not be null");
    assert(result.user !== null, "User should be returned");
    assert(result.user.login === GITHUB_USERNAME, "Username should match");

    console.log(`Deleted list with ID: ${createdListId}`);
    createdListId = null;
  } catch (error) {
    assert(
      false,
      `Function threw an error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Error handling test
async function testErrorHandling(): Promise<void> {
  startTest("Error Handling");

  try {
    // Test with invalid token
    try {
      await fetchGitHubLists(GITHUB_USERNAME, "invalid_token");
      assert(false, "Should have thrown an error for invalid token");
    } catch (error) {
      assert(true, "Correctly threw error for invalid token");
    }

    // Test with invalid username
    try {
      await fetchGitHubLists("", GITHUB_TOKEN);
      assert(false, "Should have thrown an error for empty username");
    } catch (error) {
      assert(true, "Correctly threw error for empty username");
    }

    // Test with missing parameters
    try {
      // @ts-ignore - intentionally passing invalid params
      await createGitHubList();
      assert(false, "Should have thrown an error for missing parameters");
    } catch (error) {
      assert(true, "Correctly threw error for missing parameters");
    }
  } catch (error) {
    assert(
      false,
      `Function threw an unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Run all tests in sequence
async function runTests(): Promise<void> {
  console.log("🚀 STARTING GITHUB LISTS API TESTS");

  // Basic API tests
  await testFetchGitHubLists();
  await testCreateGitHubList();
  await testUpdateGitHubList();

  // Repository tests
  const repoId = await testGetRepositoryNodeId();
  if (repoId) {
    await testAddRepoToGitHubLists(repoId);
    await testRemoveRepoFromGitHubLists(repoId);
  }

  // Cleanup
  await testDeleteGitHubList();

  // Error handling
  await testErrorHandling();

  // Print summary
  console.log("\n📊 TEST SUMMARY:");
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(
    "\n" +
      (failedTests === 0 ? "🎉 ALL TESTS PASSED!" : "⚠️ SOME TESTS FAILED"),
  );
}

// Execute all tests
runTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
});
