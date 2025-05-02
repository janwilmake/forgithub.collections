# Merge lists into zip

- POST https://merge.uithub.com takes string[] of urls returning formdata and returns FormData.
- `curl https://lists.forgithub.com/janwilmake/[slug][/page].zip` would download a zip of all repos in the list. It uses merge.uithub.com and then outputzip.uithub.com

# Lists metaview YAML

- `curl https://lists.forgithub.com/janwilmake` would retrieve the state of your lists and other repos as a giant YAML file. Lists would be a "special repo" that is dynamically generated, with github lists as the source of truth.
- `curl -X POST https://lists.forgithub.com/janwilmake -d 'YAMLSTRING'` it should trigger updating the lists. You should be able to remove, rename, and create lists in this way.
- To start, instead of git I can just use curl with this from vscode

This whole thing is very much needed, as it would finally provide me the ultimate metaview of all my work so far, and related work! Perfect starting point for creating improved context for AI as well.

# Wishlist:

- if `/gitonly` is provided, the zip contains "repo-1/.git", "repo-2/.git". All of these internal repos don't contain any data but just configuration for downloading repositories, so that the zip is very small. Getting more code from each repo would require "git fetch" in each repo
- if `/shallow` is provided they contain a shallow clone of the repo.
- Repo https://github.com/owner/[list-id] becomes a special repo whose files are added at the root of the clone, rather than in a folder of it, and whose files will be included as metadata into the lists endpoint. This way, you can have more extensive descriptions.
- Maybe: If you put one or more special list-repos in a list, this can be leveraged to create a more hierarchical view (not in the yaml though). This allows creating a very nice tree-view at some point. Imagine https://observablehq.com/@d3/force-directed-tree but with my lists and better labeling! It can become goal-based!
- Also add size info (tokencount of non-generated files) to the endpoint.
- proof `dynamic-files-to-git-poc` if possible and also see if push endpoint would work as well (see dm @zplesiv); if this works, use that, otherwise, create a read + write api using regular REST serving zip and taking a file, so it's easy to use via browsers and curl.
- create `uithub.outputgit` that goes from a FormData stream (from URL) to this!
- when user-agent matches `git/*` (any git client), stream the JSON object through `uithub.ingestjson` and `uithub.outputgit`.
- support for 'awesome xyz' repos as list sources, looking for repo urls in the repo README under the same `/owner/repo`.
- suport for downloading merging all `package.json` dependencies by looking for packages, then getting these from npm after resolving.

Example `lists.yaml` file:

```yaml
lists:
  Serverless Deployment ☁️:
    description: some desc
    items:
      - janwilmake/evaloncloud
      - janwilmake/evalon.cloud
  GitHub Data ☁️:
    description: Tools to extract data from GitHub
    items:
      - janwilmake/uit
      - janwilmake/forgithub.size
repos-unlisted:
  - janwilmake/xyz
  - janwilmake/abc
starred-unlisted:
  - zplesiv/xygit
  - zplesiv/gitlip
```
