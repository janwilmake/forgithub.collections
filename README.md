# Lists for GitHub

Lists are great to collect repos meaningfully together and allows us to create smaller, more AI-friendly repos without losing track of things. I wanted to use GitHub lists more but found it hard to keep track of which repos were listed and which weren't. Another thing was that it wasn't possibel to view all lists in a single overview. The datashape of GitHub lists is great, but there are opportunities in how we can interface with it. This is why I made 'Lists for GitHub': to create an easier interface for finding and manipulating GitHub lists, for AIs and for humans.

## Specification

Based on:

- https://oapis.org/openapi/cache.forgithub.com/getPublicStarredRepos
- https://patch.forgithub.com/index.html
- https://raw.githubusercontent.com/janwilmake/gists/refs/heads/main/js-cloudflare-worker.js
- https://quickog.com

Requirements:

- on the homepage, it should show 'Lists for GitHub' in the style of 'patch for github' website and should have a input to fill the username, navigating to `/{owner}`
- on `/{owner}` it lists all available lists in a columnary tableview. each list is a card in one of the 3 columns. each card contains all repos in thast list. it's easy to navigate to the list when clicking the list title or description. its also easy to go to the individual repos in each list on github directly. there's also link leading to the original JSON at cache.forgithub.com
- on `/{owner}/{list-slug}` it returns a website of all repos in a particular list

Every page is in a separate html file, imported in the worker, and is ingesting rendered html from the worker via a string.replace.


## Wishlist

- `git clone https://lists.forgithub.com/stars/janwilmake/lists/[slug]` or `git clone https://lists.forgithub.com/janwilmake/[slug]` would retrieve a combined zip of all repos in the list, (without `.git` for now). This can be done using
- `git clone https://lists.forgithub.com/janwilmake` would retrieve the state of your lists and other repos as a giant YAML file. Lists would be a "special repo" that is dynamically generated, with github lists as the source of truth.
- When pushing to https://lists.forgithub.com/janwilmake and it contains the same yaml format, it should trigger updating the lists. You should be able to remove, rename, and create lists in this way.
- Repo https://github.com/owner/[list-id] becomes a special repo whose files are added at the root of the clone, rather than in a folder of it, and whose files will be included as metadata into the lists endpoint. This way, you can have more extensive descriptions.
- Maybe: If you put one or more special list-repos in a list, this can be leveraged to create a more hierarchical view (not in the yaml though). This allows creating a very nice tree-view at some point. Imagine https://observablehq.com/@d3/force-directed-tree but with my lists and better labeling! It can become goal-based!
- Also add size info (tokencount of non-generated files) to the endpoint

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

## TODO:

- generate the yaml file from https://cache.forgithub.com and serve it as file-object on `/{owner}[.json]`
- proof `dynamic-files-to-git-poc` if possible and also see if push endpoint would work as well (see dm @zplesiv); if this works, use that, otherwise, create a read + write api using regular REST serving zip and taking a file, so it's easy to use via browsers and curl.
- create `uithub.outputgit` that goes from a FormData stream (from URL) to this!
- when user-agent matches `git/*` (any git client), stream the JSON object through `uithub.ingestjson` and `uithub.outputgit`.

This whole thing is very much needed, as it would finally provide me the ultimate metaview of all my work so far, and related work! Perfect starting point for creating improved context for AI as well.
