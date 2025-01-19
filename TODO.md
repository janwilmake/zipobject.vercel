## TODO ❗️

- Add correct binary URLs to zipobject (for which that is possible)
- `omitFiles` and `omitTree` doesn't work yet in `JSONStreamer`
- confirm all filters work properly
- `ZipStreamer`: Test streaming to a zip and make that work, including binary. This is a crazily useful feature now.
- `YAMLStreamer`
- Add `objectUrl`, which could do the filter directly from the JSON, and you can turn a fileObject or JSON (with $ref's) into a zip.
- Binary files shouldn't be added if maxTokens is full (maybe count maxTokens as the entire JSON that is added)
- Cache layer

Then... use zipobject at new uithub version, hosted at cloudflare.

Has huge downstream impact... Let's build this! Open source would be good for the world.
