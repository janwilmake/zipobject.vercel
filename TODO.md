# binary urls

✅ Add correct binary URLs to zipobject (for which that is possible) - raw.githubusercontent.com etc

- ✅ https://raw.githubusercontent.com/[owner]/[repo]/refs/heads/[shaOrBranch]/[path]
- ✅ https://jsr.io/@[owner]/[package]/[version] (e.g. https://jsr.io/@cfa/fetch-each/1.0.14)
- ✅ https://unpkg.com/[package]@[version]/[path] (e.g. https://unpkg.com/dodfetch@0.0.7/public/index.html)

✅ When we don't know this, use zipobject.com/file/xxx/path/xxx as a new endpoint.

## TODO ❗️

- Ensure wikizip output is in the same shape as regular github zip. now, it seems to loose folder info or so
- `omitFiles` and `omitTree` doesn't work yet in `JSONStreamer`
- confirm all filters work properly
- `ZipStreamer`: Test streaming to a zip and make that work, including binary. This is a crazily useful feature now.
- `JSONSequenceStreamer`: (https://www.rfc-editor.org/rfc/rfc7464, https://claude.ai/chat/924b67b4-de88-4d1c-870d-4ceb5cef2021) would allow to more easily build a streamer on top of.
- Add ability for the zipurl to lead to a JSON file, which could do the filter directly from the JSON, and you can turn a fileObject or JSON into a zip.
- Binary files shouldn't be added if maxTokens is full (maybe count maxTokens as the entire JSON that is added)
- Cache layer

Then... use zipobject at new uithub version, hosted at cloudflare.

Has huge downstream impact... Let's build this! Open source would be good for the world.

# Other streamers

- `YAMLStreamer`
- `MarkdownStreamer` (stream tree and files separately, so the tree comes first)
- `HTMLStreamer` (very opinionated)

These streamers could be made within ZipObject itself, or separated, since they're easily built on top of the JSONSequenceStreamer. This allows greater degree of modularity.

# plugins

Use `swc` to get the parse-data and imports, and allow these to be added as `?plugins=` (comma-separated)

```
import { getTypescriptFileData } from "../swc/getTypescriptFileData";
import { trySwcParseFile } from "../swc/trySwcParseFile";
```

Be sure to only apply it on typescript/javascript. Maybe I can make similar parse-data and imports for other major programming langauges at a later point. These plugins should be packages at some point, so others can easily make them for other purposes too.

This would make any sized repo instant... :D

# Other wishes

- $ref's support would be wild. Think about the boundary of this though
- Also, shadowrules (see shadowfs) so i can go zip to zip with rules. Interesting though to see if we can make that stream as well. Probably, everything can stream, in the end. Better to it right.

# UITHUB v2

Revamp to CloudFlare! Make it ready for open source too!

TODO:

- ✅ env variables
- finish `githubFileContentResponse` and make it all work with all filters
- binaries
- `/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, espeically cool with range request.

After I get it up to the desired quality level again:

uithub.com/owner/repo/[page]/branch/path can also visit analysis pages (just need to change the proxy). However, if the analysis isn't available yet, ensure we'll return 402 payment required.

- level 1: Sign in with github, and see your top 5 recent repos analysed after 5 minutes
- level 2: Pay $20/m and we'll daily analyse all your repos (up to X tokens)
- level 3: Allow private repos using oauth
- level 4: Create your own prompts (prompts repo open source, clone it)

# Analysis

Implement the `cacheControl` in `forgithub.analysis`; every time a scope is altered it needs to be configured to actually be up-to-date according to the strategy. analysis.github.com should never respond with data that wasn't generated yet. Now, figure out how I can basically show all filters and filter transforms in uithub for any repo. To do this, let's first simplify uithub by using zipobject. Then, I can work with what I find in https://analysis.forgithub.com/janwilmake/fetch-each/ids and parse over that. It's just switching the [page] in the fetch url.
