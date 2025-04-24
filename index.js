/**
 * Get type 'safety' in js projects in VSCode (and other IDEs with good typescript support).
 * Why js > ts? Because it runs in browsers too and with things like `eval` (without bundling/compilation).
 * Ensure @cloudflare/workers-types is accessible. *`npm i --save-dev @cloudflare/workers-types`*
 */
//@ts-check
/// <reference types="@cloudflare/workers-types" />

//@ts-ignore
import homepageHTML from "./homepage.html";
//@ts-ignore
import ownerPageHTML from "./owner-page.html";
//@ts-ignore
import listPageHTML from "./list-page.html";

export default {
  /**
   * Cloudflare Worker handler function
   * @param {Request} request - The incoming request
   * @param {{ DORM: DurableObjectNamespace }} env - Environment variables and bindings
   * @param {ExecutionContext} ctx - Execution context
   * @returns {Promise<Response>} - The response to the request
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle routes
    if (path === "/" || path === "") {
      return new Response(homepageHTML, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Parse path segments
    const segments = path.split("/").filter(Boolean);

    if (segments.length === 1) {
      const owner = segments[0];
      // Fetch lists for owner from the cache API
      try {
        const listsData = await fetchOwnerLists(owner);
        const renderedHTML = ownerPageHTML
          .replaceAll("{{OWNER}}", owner)
          .replace("{{LISTS_DATA}}", generateListsHTML(listsData, owner));

        return new Response(renderedHTML, {
          headers: { "Content-Type": "text/html" },
        });
      } catch (error) {
        return new Response(`Error fetching lists: ${error.message}`, {
          status: 500,
        });
      }
    }

    if (segments.length === 2) {
      const owner = segments[0];
      const listSlug = segments[1];

      try {
        // Fetch list details from the cache API
        const listsData = await fetchOwnerLists(owner);
        const list = listsData.lists.find((list) => list.slug === listSlug);

        if (!list) {
          return new Response("List not found", { status: 404 });
        }

        const renderedHTML = listPageHTML
          .replaceAll("{{OWNER}}", owner)
          .replaceAll("{{LIST_NAME}}", list.name)
          .replace("{{LIST_DESCRIPTION}}", list.description || "No description")
          .replace("{{REPOS_DATA}}", generateReposHTML(list.repositories));

        return new Response(renderedHTML, {
          headers: { "Content-Type": "text/html" },
        });
      } catch (error) {
        return new Response(`Error fetching list details: ${error.message}`, {
          status: 500,
        });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

/**
 * Fetch owner lists from the cache API
 * @param {string} owner - GitHub owner username
 * @returns {Promise<any>} - Lists data
 */
async function fetchOwnerLists(owner) {
  const response = await fetch(`https://cache.forgithub.com/stars/${owner}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status}`);
  }

  return await response.json();
}

/**
 * Generate HTML for lists in a 3-column layout
 * @param {Object} data - Lists data from the API
 * @returns {string} - HTML for lists display
 */
function generateListsHTML(data, owner) {
  if (!data.lists || data.lists.length === 0) {
    return '<div class="text-center text-gray-400 my-10">No lists found for this user</div>';
  }

  const chunkedLists = chunkArray(data.lists, 3);

  let html = '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">';

  for (let column = 0; column < 3; column++) {
    html += '<div class="space-y-6">';

    for (const list of chunkedLists[column] || []) {
      html += `
        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div class="p-6">
            <a href="/${owner}/${list.slug}" class="block">
              <h3 class="text-xl font-bold text-white mb-2 hover:text-purple-400 transition-colors">${
                list.name
              }</h3>
              <p class="text-gray-300 mb-4">${
                list.description || "No description"
              }</p>
              <div class="text-sm text-gray-400">
                <span>${list.totalRepositories} repositories</span>
                <span class="ml-4">Updated: ${new Date(
                  list.updatedAt,
                ).toLocaleDateString()}</span>
              </div>
            </a>
          </div>
          <div class="bg-gray-700 p-4">
            <div class="space-y-2">
              ${list.repositories
                .map(
                  (repo) => `
                <a href="https://github.com/${repo.owner}/${repo.name}" target="_blank" rel="noopener noreferrer" 
                  class="block p-2 hover:bg-gray-600 rounded flex items-center justify-between">
                  <span class="text-white">${repo.owner}/${repo.name}</span>
                  <span class="text-yellow-400 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    ${repo.stars}
                  </span>
                </a>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    html += "</div>";
  }

  html += "</div>";
  html += `
    <div class="mt-8 text-center">
      <a href="https://cache.forgithub.com/stars/${owner}" 
        class="inline-block px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors" 
        target="_blank" rel="noopener noreferrer">
        View JSON Data
      </a>
    </div>
  `;

  return html;
}

/**
 * Generate HTML for repositories in a list
 * @param {Array} repos - List of repositories
 * @returns {string} - HTML for repositories display
 */
function generateReposHTML(repos) {
  if (!repos || repos.length === 0) {
    return '<div class="text-center text-gray-400 my-10">No repositories in this list</div>';
  }

  let html =
    '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';

  for (const repo of repos) {
    html += `
      <div class="bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
        <a href="${
          repo.url
        }" target="_blank" rel="noopener noreferrer" class="block">
          <h3 class="text-lg font-bold text-white mb-2 hover:text-purple-400 transition-colors">${
            repo.owner
          }/${repo.name}</h3>
          <p class="text-gray-300 mb-4 text-sm line-clamp-3">${
            repo.description || "No description"
          }</p>
          <div class="flex items-center text-sm text-gray-400">
            <span class="flex items-center">
              <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              ${repo.stars}
            </span>
            ${
              repo.isPrivate
                ? `<span class="ml-4 px-2 py-1 text-xs font-medium text-white bg-gray-600 rounded">Private</span>`
                : ""
            }
          </div>
        </a>
      </div>
    `;
  }

  html += "</div>";

  return html;
}

/**
 * Split array into chunks for column layout
 * @param {Array} array - Array to split
 * @param {number} columns - Number of columns
 * @returns {Array} - Array of column arrays
 */
function chunkArray(array, columns) {
  const result = Array(columns)
    .fill(null)
    .map(() => []);

  // Distribute items across columns in a balanced way
  array.forEach((item, index) => {
    const columnIndex = index % columns;
    //@ts-ignore
    result[columnIndex].push(item);
  });

  return result;
}
