# Lists for GitHub

[![janwilmake/forgithub.lists context](https://badge.forgithub.com/janwilmake/forgithub.lists)](https://uithub.com/janwilmake/forgithub.lists) [![](https://badge.xymake.com/janwilmake/status/1915338073061167487)](https://xymake.com/janwilmake/status/1915338073061167487)

GitHub Lists, a relatively new feature, are great to collect repos meaningfully together and allows us to create smaller, more AI-friendly repos without losing track of things. I wanted to use GitHub lists more but found it hard to keep track of which repos were listed and which weren't. Another thing was that it wasn't possibel to view all lists in a single overview. The datashape of GitHub lists is great, but there are opportunities in how we can interface with it. This is why I made 'Lists for GitHub': to create an easier interface for finding and manipulating GitHub lists, for AIs and for humans.

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
