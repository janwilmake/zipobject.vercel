# More (2025-02-11)

- ✅ HTML streamer
- ✅ Ensure that it immediately streams the start of the html file, so we have an immediate response
- Add loading indicator whilst loading that's hidden at the end
- Ensure it would work for any zip (not only gitub. lets provide original content url)
- Ensure tokens render
- Ensure HTML works correctly from any base URL (data.url should be provided with zipobject)
- Add [LLM Filter] button to headerbar, which prompts message and redirects to filter.zipobject.com
- Confirm the response is same HTML now in browsers.
- Confirm all filters work properly now

Ensure the thing doesn't crash when files are empty (or other reasons)

# Stream directly from github

- Figure out how to parse index immediately for a `.tar.gz` file
- Use tar.gz url instead!

# Cache

- ✅ Cache based on KEY `(immutable && !auth ? url : source-etag) + filters sorted`.
- ✅ If cache-hit, use that as source, and apply desired streamer with plugins
- ✅ Cache as ZIP on R2 by streaming the zip streamer to there if there's no cache-hit.
- ✅ For private repos, allow prop `disableCache`
- BONUS: Figure out a way to also look for incrementally broadening filters to see if we have a broader filter cached

Having this allows direct doc viewing from uithub, but much faster (replacing https://docs.uithub.com logic)

To not decrease speed, add a waitUntil that schedules execution of the same URL but rather streams to cache it, and doesn't have a regular response. Create schedule.boncron.com for this.

Place R2 in same place as the Vercel function: WEUR so it's fast with cache.

# Parsing

- ✅ also parse `mainComment`
- ✅ also parse `exportDefault:string[]` object properties
- ✅ also parse `data` interface object key values!
- TODO: also parse non-references incase it's a primitive such as string,number,boolean.

# Fetch built-in

- ✅ when using json as source, support turning $ref's into urls. at first, just do $ref for the top level, to keep it simple
- For `ZipStreamer`, fetch binary data where only a url is present (incase of fileobject input) - max 1000 subrequests and concurrency will be a major limitation here!

# Other streamers

These streamers could be made within ZipObject itself, or separated, since they're easily built on top of the `JSONSequenceStreamer`. This allows greater degree of modularity. Good challenge to create a streaming api over streaming api.

Especially making a good HTML streamer is going to be very interesting to get right. If I can somehow have super low paint time, that's very good for usability.

# `/file` endpoint

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, espeically cool with range request.

In uithub, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

# UITHUB v2

Then... use zipobject at new uithub version, hosted at cloudflare. Has huge downstream impact... Let's build this! Open source would be good for the world. Revamp to CloudFlare! Make it ready for open source too!

TODO:

- ✅ env variables
- ✅ binaries
- proxy `owner/repo/blob/...` to `/file`
- finish `githubFileContentResponse` and make it all work with all filters
- test stripe
- test auth
- replace uithub with it if I feel comfortable

After I get it up to the desired quality level again:

uithub.com/owner/repo/[page]/branch/path can also visit analysis pages (just need to change the proxy).

Also, add proxy to typedoc markdown of any repo, an api that can be hosted on vercel: https://www.typedoc-plugin-markdown.org/docs https://github.com/janwilmake/typedoc-deno

However, if the analysis isn't available yet, ensure we'll return 402 payment required.

- level 1: Sign in with github, and see your top 5 recent repos analysed after 5 minutes
- level 2: Pay $20/m and we'll daily analyse all your repos (up to X tokens)
- level 3: Allow private repos using oauth
- level 4: Create your own prompts (prompts repo open source, clone it)

# Analysis

Implement the `cacheControl` in `forgithub.analysis`; every time a scope is altered it needs to be configured to actually be up-to-date according to the strategy. analysis.github.com should never respond with data that wasn't generated yet. Now, figure out how I can basically show all filters and filter transforms in uithub for any repo. To do this, let's first simplify uithub by using zipobject. Then, I can work with what I find in https://analysis.forgithub.com/janwilmake/fetch-each/ids and parse over that. It's just switching the [page] in the fetch url.

# Integrate threads, commits, and repos/[owner]

- owner/repo/issues
- owner/repo/pulls
- owner/repo/discussions
- owner/repo/commits
- repos/owner: all repos as giant file object

# `/tree` endpoint

This can do the fastest possible way of getting the tree/index. Needs rangerequest to be fast (see poc at `zipobject.range`).

# binary urls for private repos

These should not use the raw.githubusercontent, but rather `zipboject.com/file`

# Improve zip finding and binary urls

Issue: not all branches are accessible. Many will actually give a dead link, which is problematic!

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
