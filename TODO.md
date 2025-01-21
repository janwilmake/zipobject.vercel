# Improve zip finding and binary urls

Possible github URLs in browser:

- https://github.com/facebook/react
- https://github.com/facebook/react/tree|blob/main/[path]
- https://github.com/facebook/react/wiki/[page]
- https://github.com/facebook/react/tree/18eaf51bd51fed8dfed661d64c306759101d0bfd
- https://github.com/facebook/react/tree/gh/mvitousek/5/orig/compiler (branch can have strange characters including `/`)
- https://github.com/facebook/react/tree/v16.3.1 (it's a tag)

Two strategies are possible to figure out the zip url and raw url:

1. trial and error; try most likely and try other possibilities later to finally get the zip url. the tricky part is that https://codeload.github.com/facebook/react/zip/refs/ANYTHING will always redirect even if it didn't exist, so we need to follow the redirect.
2. use `git.listServerRefs`. If we cache it and But this easily takes half a second...

It's best to create a function to do this trial and error. This would most likely just be ratelimited by 5000 req/hour/ip. Additionally we could cache the tagnames and branchnames - but not the shas they're tied to. However, I don't think this is worth the additional complexity as the amount of trials before a hit is likely between 2-3 on average (assuming we start with 2 in parallel).

# Confirm

- Adhere to `maxTokens`
- Confirm all filters work properly now
- Ensure the thing doesn't crash when files are empty (or other reasons)

# Fetch builtin

- ✅ when using json as source, support turning $ref's into urls. at first, just do $ref for the top level, to keep it simple
- For `ZipStreamer`, fetch binary data where only a url is present (incase of fileobject input) - max 1000 subrequests and concurrency will be a major limitation here!

# Other streamers

These can be made separately as open source packages, to encourage others to build more.

- `YAMLStreamer`
- `MarkdownStreamer` (stream tree and files separately, so the tree comes first)
- `HTMLStreamer` (very opinionated)

These streamers could be made within ZipObject itself, or separated, since they're easily built on top of the `JSONSequenceStreamer`. This allows greater degree of modularity.

# `/file` endpoint

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, espeically cool with range request.

# UITHUB v2

Then... use zipobject at new uithub version, hosted at cloudflare.

Has huge downstream impact... Let's build this! Open source would be good for the world.

Revamp to CloudFlare! Make it ready for open source too!

TODO:

- ✅ env variables
- ✅ binaries
- proxy `/file`
- finish `githubFileContentResponse` and make it all work with all filters

After I get it up to the desired quality level again:

uithub.com/owner/repo/[page]/branch/path can also visit analysis pages (just need to change the proxy). However, if the analysis isn't available yet, ensure we'll return 402 payment required.

- level 1: Sign in with github, and see your top 5 recent repos analysed after 5 minutes
- level 2: Pay $20/m and we'll daily analyse all your repos (up to X tokens)
- level 3: Allow private repos using oauth
- level 4: Create your own prompts (prompts repo open source, clone it)

# Analysis

Implement the `cacheControl` in `forgithub.analysis`; every time a scope is altered it needs to be configured to actually be up-to-date according to the strategy. analysis.github.com should never respond with data that wasn't generated yet. Now, figure out how I can basically show all filters and filter transforms in uithub for any repo. To do this, let's first simplify uithub by using zipobject. Then, I can work with what I find in https://analysis.forgithub.com/janwilmake/fetch-each/ids and parse over that. It's just switching the [page] in the fetch url.
