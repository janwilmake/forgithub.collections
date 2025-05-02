# GitHub Lists CLI

A simple command-line interface for managing your GitHub Lists using curl.

## Overview

GitHub Lists is a feature that allows you to create collections of repositories. This CLI tool provides a simple way to manage your lists directly from the command line using curl.

You can:

- Get a YAML representation of all your lists
- Modify that YAML locally
- Update your GitHub Lists by sending the modified YAML back

## Prerequisites

- [curl](https://curl.se/) installed on your system
- A GitHub Personal Access Token (PAT) with `repo` scope
- You must be a sponsor of the service owner (costs 1 cent per request)

## Usage

### 1. Authenticate with the service

```bash
curl -X POST "https://lists.forgithub.com/login?token=YOUR_GITHUB_PAT" \
  -c cookie_jar.txt
```

Replace `YOUR_GITHUB_PAT` with your GitHub Personal Access Token. This command will:

- Authenticate you with the service
- Save your session cookies to a file named `cookie_jar.txt` for subsequent requests

### 2. Get your current GitHub Lists

```bash
curl -X GET "https://lists.forgithub.com/YOUR_GITHUB_USERNAME" \
  -b cookie_jar.txt \
  -o lists.yaml
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username. This command will:

- Fetch your current GitHub Lists state
- Save it to a local file named `lists.yaml`

The YAML file will contain:

- All your GitHub Lists
- Your repositories that aren't in any list
- Your starred repositories that aren't in any list

### 3. Update your GitHub Lists

After modifying the YAML file, you can update your GitHub Lists:

```bash
curl -X POST "https://lists.forgithub.com/YOUR_GITHUB_USERNAME" \
  -b cookie_jar.txt \
  -H "Content-Type: text/yaml" \
  --data-binary @lists.yaml
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username. This command will:

- Send your modified YAML back to the server
- Update your GitHub Lists accordingly

## Example YAML Format

```yaml
lists:
  "Serverless Deployment ☁️":
    description: "Tools for serverless deployment"
    items:
      - owner/repo1
      - owner/repo2
  "GitHub Data ☁️":
    description: "Tools to extract data from GitHub"
    isPrivate: true
    items:
      - owner/repo3
      - owner/repo4
repos-unlisted:
  - owner/unlistedrepo1
  - owner/unlistedrepo2
starred-unlisted:
  - otherowner/starredrepo1
  - otherowner/starredrepo2
```

## Notes

- The service charges 1 cent per request, so you must be a sponsor of the service owner.
- To create a private list, add `isPrivate: true` to the list configuration.
- The YAML format is the source of truth - any changes you make to the YAML will be reflected in your GitHub Lists.
- The update operation is asynchronous and returns immediately with a 202 status code.

## Error Handling

If you encounter errors:

- Ensure your GitHub PAT has the correct permissions
- Check that you're a sponsor of the service owner
- Verify that your YAML is correctly formatted
