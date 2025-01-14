General purpose edge function that extracts any zip into a JSON/YAML object.

Stream Layer:

- ✅ Ability to pass either url or zipUrl
- ✅ Backwards compatible with uithub filters
- ✅ Support tarballs and zipballs
- ✅ Low memory footprint by responding in a stream
  - ✅ JSON Streaming (files first, then tree, then size)
  - 🟠 Streaming to a ZIP (also binary files)

Cache Layer:

- etag based caching, and immutable zips can visit cache directly
- Ability to disable cache
- Configurable max-age/staleness
- Ratelimit that can be bypassed by API key holders (or if things were cached)

TODO:

- omitFiles doesn't work yet in `JSONStreamer`
- Test streaming to a zip and make that work, including binary. Can I now stream all markdown in `oven-sh/bun`?
- Binary files shouldn't be added if maxTokens is full (maybe count maxTokens as the entire JSON that is added)
- Create the cache layer
