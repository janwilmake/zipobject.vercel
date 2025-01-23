# ZIPObject

> [!NOTE]  
> General purpose edge function that extracts any zip into a JSON/YAML object with a focus on cost/efficiency and performance.

Background: For uithub and other work, I need to be capable of extracting gigabytes of data per second cheaply and fast. By making things stream and cache results after computation, we can effectively remove all bottlenecks and have insane speed.

Stream/Filter Layer:

- ✓ Ability to pass either url or zipUrl
- ✓ Backwards compatible with uithub filters
- ✓ Support tarballs and zipballs
- ✓ Low memory footprint by responding in a stream
  - ✓ JSON Streaming (files first, then tree, then size)
  - ✓ Streaming to a ZIP (also binary files)

Cache Layer (TODO):

- etag based caching, and immutable zips can visit cache directly
- Ability to disable cache for private repos
- Support for RangeRequest for any zip
- Ratelimit that can be bypassed by API key holders (or if things were cached)

Wishlist:

- ❗️ VSCode-like path-match and in-file search with regex (especially useful cross-repo!)
- Support to create a single zip from an object that references multiple zips as `FileEntry<{url:string}>` or `JSON<{$ref:string}>`
- Shadowrule support (see https://github.com/janwilmake/shadowfs)
- Support for [git lfs](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)
- A plugin for installation of packages
- A plugin for bundling
- A plugin that normalizes the imports based on other available paths, and makes more files available if the import references files that weren't available.
- Also, shadowrules (see shadowfs) so i can go zip to zip with rules. Interesting though to see if we can make that stream as well. Probably, everything can stream, in the end. Better to it right.

# Idea

Instead of open sourcing uithub, why don't I open source this? The thing is a lot of people would then start streaming zips and thus using github as a datastore for their product. This is currently hard. It's a really cool piece of technology, so definitely cool to open source it.

> [!WARNING]  
> Could cause lot of competition. But maybe that's what I want.

# Performance / Cost: Max $50

To prevent abuse, vercel spend management caps my usage at $50 which is good enough. If this is hit, I can introduce ratelimits to the people hitting it the most.

https://vercel.com/code-from-anywheres-projects/~/settings/billing

https://vercel.com/code-from-anywheres-projects/zipobject/observability/route/%2Fapi%2Findex

https://vercel.com/code-from-anywheres-projects/~/usage?projectId=prj_MA96ZLbSkYD6t72IzEpAc0eJiBcJ

> [!TIP]
> Let's keep an eye on these pages, if it starts hitting high, we may benefit from reducing allocated memory, for example, all the way down to a 128MB edge function. As a fallback, we can do 3GB for large repos, if that would make it faster.

# Intended dependant open source projects

- uithub: exploration of github
- npmjz: exploration of npmjs/jsr and other package managers
- ingestwiki: exploration of wikipedia
- site2text: exploration of any website as markdown
- gcombinator.news: the ycombinator site but with extra features
