var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
import homepageHtml from "./b498933963d721574e6bebb235e624f841afe430-homepage.html";
import ownerListsHtml from "./597de2d6e4af209bd0067dee3b2839c2779801fc-owner-lists.html";
import listDetailHtml from "./a316c5d3df1d42fe95307bb335460a6ca273cddc-list-detail.html";
import errorHtml from "./aeb8bf3bd494ce9c3c262bf1b17d68afc447b3ed-error.html";
var API_BASE_URL = "https://cache.forgithub.com";
var forgithub_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/" || path === "") {
        return new Response(homepageHtml, {
          headers: { "Content-Type": "text/html" }
        });
      }
      const ownerPattern = /^\/([^\/]+)$/;
      const listDetailPattern = /^\/([^\/]+)\/([^\/]+)$/;
      const ownerMatch = path.match(ownerPattern);
      if (ownerMatch) {
        const owner = ownerMatch[1];
        return await handleOwnerLists(owner);
      }
      const listDetailMatch = path.match(listDetailPattern);
      if (listDetailMatch) {
        const owner = listDetailMatch[1];
        const listId = listDetailMatch[2];
        return await handleListDetail(owner, listId);
      }
      return new Response(
        errorHtml.replaceAll("{{ERROR_MESSAGE}}", "Page not found"),
        {
          status: 404,
          headers: { "Content-Type": "text/html" }
        }
      );
    } catch (error) {
      console.error("Error handling request:", error);
      return new Response(
        errorHtml.replaceAll(
          "{{ERROR_MESSAGE}}",
          error.message || "An error occurred"
        ),
        {
          status: 500,
          headers: { "Content-Type": "text/html" }
        }
      );
    }
  }
};
async function handleOwnerLists(owner) {
  try {
    const response = await fetch(`${API_BASE_URL}/stars/${owner}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch lists for ${owner}: ${response.statusText}`
      );
    }
    const data = await response.json();
    let listsHtml = "";
    if (data.lists && data.lists.length > 0) {
      data.lists.forEach((list) => {
        const repoCount = list.totalRepositories;
        listsHtml += `
          <a href="/${owner}/${list.slug}" class="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-all duration-300">
            <h3 class="text-xl font-bold text-white mb-2">${escapeHtml(
          list.name
        )}</h3>
            <p class="text-gray-300 mb-4">${list.description ? escapeHtml(list.description) : "No description"}</p>
            <div class="flex justify-between items-center">
              <span class="text-purple-400">${repoCount} repositor${repoCount === 1 ? "y" : "ies"}</span>
              <span class="text-gray-400 text-sm">Updated: ${formatDate(
          list.updatedAt
        )}</span>
            </div>
          </a>
        `;
      });
    } else {
      listsHtml = `
        <div class="bg-gray-800 p-6 rounded-lg">
          <p class="text-gray-300">No lists found for ${escapeHtml(owner)}</p>
        </div>
      `;
    }
    let starredReposHtml = "";
    if (data.stars && data.stars.length > 0) {
      const topStars = data.stars.slice(0, 10);
      topStars.forEach((repo) => {
        starredReposHtml += `
          <div class="bg-gray-800 p-4 rounded-lg">
            <h4 class="text-white font-bold">${escapeHtml(repo.name)}</h4>
            <p class="text-gray-300 text-sm truncate">${repo.description ? escapeHtml(repo.description) : "No description"}</p>
            <div class="flex justify-between mt-2">
              <span class="text-xs text-purple-400">\u2B50 ${repo.stargazers_count}</span>
              <a href="${repo.html_url}" target="_blank" class="text-xs text-blue-400 hover:underline">View on GitHub</a>
            </div>
          </div>
        `;
      });
    } else {
      starredReposHtml = `
        <div class="bg-gray-800 p-4 rounded-lg">
          <p class="text-gray-300">No starred repositories found</p>
        </div>
      `;
    }
    let html = ownerListsHtml.replaceAll("{{OWNER}}", escapeHtml(owner)).replaceAll("{{LISTS}}", listsHtml).replaceAll("{{STARRED_REPOS}}", starredReposHtml);
    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error(`Error in handleOwnerLists:`, error);
    return new Response(
      errorHtml.replaceAll(
        "{{ERROR_MESSAGE}}",
        `Failed to load lists for ${owner}: ${error.message}`
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}
__name(handleOwnerLists, "handleOwnerLists");
async function handleListDetail(owner, listId) {
  try {
    const response = await fetch(`${API_BASE_URL}/stars/${owner}`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch data for ${owner}: ${response.statusText}`
      );
    }
    const data = await response.json();
    const list = data.lists.find((l) => l.slug === listId);
    if (!list) {
      return new Response(
        errorHtml.replaceAll(
          "{{ERROR_MESSAGE}}",
          `List "${listId}" not found for ${owner}`
        ),
        {
          status: 404,
          headers: { "Content-Type": "text/html" }
        }
      );
    }
    let reposHtml = "";
    if (list.repositories && list.repositories.length > 0) {
      list.repositories.forEach((repo) => {
        reposHtml += `
          <div class="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-all duration-300">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xl font-bold text-white">${escapeHtml(
          repo.name
        )}</h3>
              <span class="text-purple-400">\u2B50 ${repo.stars}</span>
            </div>
            <p class="text-gray-300 mb-4">${repo.description ? escapeHtml(repo.description) : "No description"}</p>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">${escapeHtml(repo.owner)}</span>
              <a href="${repo.url}" target="_blank" rel="noopener noreferrer" 
                 class="text-blue-400 hover:underline flex items-center gap-1">
                View on GitHub
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        `;
      });
    } else {
      reposHtml = `
        <div class="bg-gray-800 p-6 rounded-lg">
          <p class="text-gray-300">No repositories found in this list</p>
        </div>
      `;
    }
    let html = listDetailHtml.replaceAll("{{OWNER}}", escapeHtml(owner)).replaceAll("{{LIST_NAME}}", escapeHtml(list.name)).replaceAll(
      "{{LIST_DESCRIPTION}}",
      list.description ? escapeHtml(list.description) : "No description"
    ).replaceAll("{{REPOS}}", reposHtml);
    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error(`Error in handleListDetail:`, error);
    return new Response(
      errorHtml.replaceAll(
        "{{ERROR_MESSAGE}}",
        `Failed to load list "${listId}" for ${owner}: ${error.message}`
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}
__name(handleListDetail, "handleListDetail");
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
__name(formatDate, "formatDate");
function escapeHtml(str) {
  if (!str)
    return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
__name(escapeHtml, "escapeHtml");
export {
  forgithub_default as default
};
//# sourceMappingURL=index.js.map
