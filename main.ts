import { middleware, getSponsor, Env as SponsorflareEnv } from "sponsorflare";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  getGitHubListsAndUnlistedRepos,
  updateGitHubListsState,
  GithubListsState,
} from "./getset-lists";

export { SponsorDO, RatelimitDO } from "sponsorflare";

export interface Env extends SponsorflareEnv {
  // Add any additional environment variables here
}

export default {
  fetch: async (request: Request, env: Env, ctx: any) => {
    console.log("ENTERING FN");
    // Handle Sponsorflare middleware endpoints (/login, /callback, /github-webhook)
    const sponsorflare = await middleware(request, env);
    if (sponsorflare) return sponsorflare;

    const url = new URL(request.url);

    // Check if the user is authenticated
    const { charged, access_token, owner_login, is_authenticated, ...sponsor } =
      await getSponsor(request, env, {
        charge: 1, // Charge 1 cent per request
      });

    console.log({ url, charged, access_token });

    // If not authenticated, redirect to login
    if (!is_authenticated || !access_token) {
      return new Response("Redirecting", {
        status: 302,
        headers: { Location: `${url.origin}/login?scope=repo` },
      });
    }

    const pathParts = url.pathname.split("/").filter(Boolean);

    // Only process requests that match the format /:username. redirect if not there
    if (pathParts.length !== 1) {
      return new Response("Redirecting", {
        status: 302,
        headers: { Location: `/${owner_login}` },
      });
    }

    const username = pathParts[0];

    // If authenticated but not charged (not enough balance), return payment required
    if (!charged) {
      return new Response(
        "Payment required. Please sponsor to use this service.",
        {
          status: 402,
          headers: {
            "Content-Type": "text/plain",
            Location: `https://github.com/sponsors/${env.ADMIN_OWNER_LOGIN}`,
          },
        },
      );
    }

    // Handle GET request - return YAML of lists
    if (request.method === "GET") {
      try {
        const listsState = await getGitHubListsAndUnlistedRepos(
          username,
          access_token,
        );
        const yamlContent = stringifyYaml(listsState);

        return new Response(
          `# yaml-language-server: $schema=https://lists.forgithub.com/lists.schema.json\n${yamlContent}`,
          { headers: { "Content-Type": "text/yaml;charset=utf8" } },
        );
      } catch (error) {
        console.error(`Error fetching lists for ${username}:`, error);
        return new Response(`Error fetching GitHub lists: ${error}`, {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // Handle POST request - update lists based on YAML
    if (request.method === "POST") {
      try {
        // Get the YAML content from the request body
        const yamlContent = await request.text();

        // Parse the YAML content to get the target state
        const targetState = parseYaml(yamlContent) as GithubListsState;

        // Use ctx.waitUntil to ensure the operation completes even after response is sent
        const updatePromise = updateGitHubListsState(
          username,
          access_token,
          targetState,
        );

        // Start the update process but don't wait for it to complete
        ctx.waitUntil(
          updatePromise.then(
            (result) =>
              console.log(`Lists update for ${username} completed:`, result),
            (error) =>
              console.error(`Lists update for ${username} failed:`, error),
          ),
        );

        // Return an immediate success response
        return new Response("Update request received and processing", {
          status: 202,
          headers: { "Content-Type": "text/plain" },
        });
      } catch (error) {
        console.error(`Error updating lists for ${username}:`, error);
        return new Response(`Error updating GitHub lists: ${error}`, {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    // Handle unsupported methods
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, POST" },
    });
  },
};
