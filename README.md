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
- Support for RangeRequest for any zip

TODO:

- `omitFiles` doesn't work yet in `JSONStreamer`
- confirm all filters work properly
- Test streaming to a zip and make that work, including binary. This is a crazily useful feature now.
- Binary files shouldn't be added if maxTokens is full (maybe count maxTokens as the entire JSON that is added)

Then... use zipobject in zipobject.config and uithub. uithub can now move to cloudflare!

After all that, cache layer!
