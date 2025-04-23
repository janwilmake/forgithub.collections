# Lists for GitHub

Context:

- https://oapis.org/openapi/cache.forgithub.com/getPublicStarredRepos
- https://patch.forgithub.com/index.html
- https://raw.githubusercontent.com/janwilmake/gists/refs/heads/main/js-cloudflare-worker.js

Spec

- on the homepage, it should show 'Lists for GitHub' in the style of 'patch for github' website and should have a input to fill the username, navigating to `/{owner}`
- on `/{owner}` it lists all available lists in a columnary tableview. each list is a card in one of the 3 columns. each card contains all repos in thast list. it's easy to navigate to the list when clicking the list title or description. its also easy to go to the individual repos in each list on github directly. there's also link leading to the original JSON at cache.forgithub.com
- on `/{owner}/{list-slug}` it returns a website of all repos in a particular list

Every page is in a separate html file, imported in the worker, and is ingesting rendered html from the worker via a string.replace.

# Wishlist

- `git clone https://github.com/stars/janwilmake/lists/[slug]` would retrieve a combined zip of all repos in the list, (without `.git` for now).
- `git clone https://github.com/janwilmake/lists` would retrieve the state of your lists and other repos as a giant file
