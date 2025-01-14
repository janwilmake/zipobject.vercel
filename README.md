General purpose edge function that extracts any zip into a JSON/YAML object with a focus on cost/efficiency and performance.

Background: For uithub and other work, I need to be capable of extracting gigabytes of data per second cheaply and fast. By making things stream and cache results after computation, we can effectively remove all bottlenecks and have insane speed.

Stream/Filter Layer:

- ✓ Ability to pass either url or zipUrl
- ✓ Backwards compatible with uithub filters
- ✓ Support tarballs and zipballs
- ✓ Low memory footprint by responding in a stream
  - ✓ JSON Streaming (files first, then tree, then size)
  - ✓ Streaming to a ZIP (also binary files)

Cache Layer:

- etag based caching, and immutable zips can visit cache directly
- Ability to disable cache
- Configurable max-age/staleness
- Ratelimit that can be bypassed by API key holders (or if things were cached)
- Support for RangeRequest for any zip

Improved processing:

- VSCode-like path-match and in-file search with regex
- Support to create a single zip from an object that references multiple zips as `FileEntry<{url:string}>` or `JSON<{$ref:string}>`
- Shadowrule support (see https://github.com/janwilmake/shadowfs)
- Support for [git lfs](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)

TODO:

- `omitFiles` doesn't work yet in `JSONStreamer`
- confirm all filters work properly
- Test streaming to a zip and make that work, including binary. This is a crazily useful feature now.
- Add `objectUrl`, which could do the filter directly from the JSON, and you can turn a fileObject or JSON (with $ref's) into a zip.
- Binary files shouldn't be added if maxTokens is full (maybe count maxTokens as the entire JSON that is added)

Then... use `zipobject` in `zipobject.config` and `uithub`. uithub can now move to cloudflare!

After all that, cache layer!

# Performance / Cost: Max $50

To prevent abuse, vercel spend management caps my usage at $50 which is good enough. If this is hit, I can introduce ratelimits to the people hitting it the most.

https://vercel.com/code-from-anywheres-projects/~/settings/billing

https://vercel.com/code-from-anywheres-projects/zipobject/observability/route/%2Fapi%2Findex

https://vercel.com/code-from-anywheres-projects/~/usage?projectId=prj_MA96ZLbSkYD6t72IzEpAc0eJiBcJ

Let's keep an eye on these pages, if it starts hitting high, we may benefit from reducing allocated memory, for example, all the way down to a 128MB edge function. As a fallback, we can do 3GB for large repos, if that would make it faster.
