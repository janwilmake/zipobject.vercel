# January 10: Idea zipsubset

Goal: superior uithub caching

Basically, imagine if we could store every subdirectory of a large git repo as zipsubset. This could give me an edge with uithub as it can create superior caching. The key technology is streaming a zip of any size into another zip on R2. Having this is also great to start working with datasets like wikipedia.

# January 14, 2025

Started the attempt to create a much more general purpose, and improved version of the core tech within uithub: unzipping with filters.

- ✅ Cleanup based on uithub
- ✅ Allow tarballs too
- ✅ Implemented streaming the response
- ✅ Adhere to maxTokens by counting tokens (characters / 5) in the ballstreams, and once it's higher than maxTokens, skip the rest
- ✅ Fix path filter

# binary urls (january 20, 2025)

✅ Add correct binary URLs to zipobject (for which that is possible) - raw.githubusercontent.com etc

- ✅ https://raw.githubusercontent.com/[owner]/[repo]/refs/heads/[shaOrBranch]/[path]
- ✅ https://jsr.io/@[owner]/[package]/[version] (e.g. https://jsr.io/@cfa/fetch-each/1.0.14)
- ✅ https://unpkg.com/[package]@[version]/[path] (e.g. https://unpkg.com/dodfetch@0.0.7/public/index.html)

✅ When we don't know this, use zipobject.com/file/xxx/path/xxx as a new endpoint.

# bug: wiki first segment missing (january 20, 2025)

- ✅ Ensure wikizip output is in the same shape as regular github zip. now, it seems to loose folder info or so.
- ✅ Figured it out: removing the first folder from the zip is now optional

# Figure out core-streams (january 20, 2025)

- ✅ `omitFiles` and `omitTree` doesn't work yet in `JSONStreamer`
- ✅ `ZipStreamer`: Test streaming to a zip and make that work, including binary files.
- ✅ Add ability for the `pathUrl` to lead to a JSON file, which could do the filter directly from the JSON, and you can turn a fileObject or JSON into a zip (looking at shape to determine fileObject or JSON)
- ✅ `JSONSequenceStreamer`: (https://www.rfc-editor.org/rfc/rfc7464, https://claude.ai/chat/924b67b4-de88-4d1c-870d-4ceb5cef2021) would allow to more easily build a streamer on top of.

This is a crazily useful API already.

# Parsing with SWC (january 20, 2025)

Let's say we want to do a prompt on a file that imports some crucial functions from other files, for properly understanding stuff, we'd want to ensure also having the context of these files in there.

The best way would be to have an api that can do the same as zipobject, but it would ensure imported files aren't omitted. This is hard because we still want to be efficient and apply the filter.

Proposal for an api:

1. retrieve zipobject without requested filter
2. retrieve parsed files with their imports
3. retrieve zipobject with requested filter
4. based on the files we have in the filtered result, recursively add imported files to that, until everything is imported.
5. return

The crux is that we don't want to alter the file original files (e.g. by adding the imported stuff into the file, as comment or something), so we can still support editing.

We also want to allow this same principle when filtering for nlang.

Another thing that would be marvelous to have support for would be external imports (using package managers and URLs)

That seems all possible but the fact that we need to get all files without filter, just because there may be some in there, that contain imports, is a bit inefficient. This will definitely cause problems for larger repos.

Another option could be:

Proposal for an api:

1. ✅ retrieve zipobject with requested filter
2. ✅ retrieve imports
3. ✅ add them to the original result
4. retrieve imported files that aren't present using derivated zipobject request, and also parse their imports
5. repeat 3 until there are no more
6. ✅ return

This will require more roundtrips but with range-request capability and caching this shouldn't be that big of an issue, especially since most import-chains won't be that huge, the amount of roundtrips will be doable, especially of we place these servers nearby.

For now, I keep it simple because I don't allow retrieving for partially filtered repos as i also don't allow imports from packages or urls yet. Later we can do this extra retrieval loop too.

# Do this in zipobject itself? (january 21, 2025)

I'm now turning this into a non-streaming API while this isn't strictly needed. If I wanted, I could add additional feature-flags to zipobject itself:

- respond with parse
- respond with parse-data
- respond with imported modules/names

All of this wouldn't take additional memory or dependencies, and will be super fast. Therefore, maybe it makes much more sense, actually. We are targeting code, after all. The same goes for config.zipobject.com btw. Maybe, the modularity of it all is not worth the degradation of quality. Breaking the stream has a huge impact: https://zipobject.com/npmjs.com/package/react-dom/v/19.0.0 is instant. https://imports.zipobject.com/npmjs.com/package/react-dom/v/19.0.0 breaks.

Anyway, the API itself is great now. Next step is incorporating these type of parses into zipobject itself, while still allowing to cache as well and not doing too many calculations at once.

# plugins (january 21, 2025)

✅ Use `swc` to get the `parse`, `data`, `imports`, and allow these to be added as `?plugins=` (comma-separated)

```
import { getTypescriptFileData } from "../swc/getTypescriptFileData";
import { trySwcParseFile } from "../swc/trySwcParseFile";
```

✅ Be sure to only apply it on typescript/javascript. Maybe I can make similar parse-data and imports for other major programming langauges at a later point. These plugins should be packages at some point, so others can easily make them for other purposes too.

✅ This would make any sized repo instant... :D

✅ Internalize types that came from `edge-util`

✅ Ensure paths are available, or skip normalization as it's a jsconfig/tsconfig-dependent spec. Hard to really get right. **skipped**

# Zip Object Improvement (February 6th, 2025)

✅ Improve memory footprint of JSONStreamer and JSONSequenceStreamer

✅ Build markdown streamer, yaml streamer

✅ Support uithub as zipobject domain leading to the same as github

✅ Confirm llmtext.com forwards to markdownstreamer, so we keep streaming.

✅ Adhere to `maxTokens`

✅ uithub-chat: ensure 25k tokenlimit is applied to be ok with all models

✅ when using json as source, support turning $ref's into urls. at first, just do $ref for the top level, to keep it simple

✅ HTML streamer

✅ Ensure that it immediately streams the start of the html file, so we have an immediate response

# Parsing (2025-02-11)

- ✅ also parse `mainComment`
- ✅ also parse `exportDefault:string[]` object properties
- ✅ also parse `data` interface object key values!

# Cache (2025-02-11)

- ✅ Cache based on KEY `(immutable && !auth ? url : source-etag) + filters sorted`.
- ✅ If cache-hit, use that as source, and apply desired streamer with plugins
- ✅ Cache as ZIP on R2 by streaming the zip streamer to there if there's no cache-hit.
- ✅ For private repos, allow prop `disableCache`

# Ship functional zipobject with regex search (2025-03-17)

- ✅ Add new functionality for path search
- ✅ Implement search with options into tarballStream and zipballStream.
- ✅ Make it run again and test it using some URL that works
- ✅Test this with the content search regex for a tweet and path regex of `*.md`. Confirm that works
- ✅ Deploy
- ✅ make this work: http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https?://(x|twitter)\.com/([^/]+)/status/(\d+)&searchUseRegex=true&pathPatterns=_.md,_.ts
- ✅ Allow admin apiKey via GET and test http://zipobject.vercel.app. Fix crash there.
- ✅ If it all works on there, make it work on zipobject.com too.
- ✅ URLEncoded regex does not work for some reason. Figure out the difference between http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https?://(x|twitter)\.com/([^/]+)/status/(\d+)&searchUseRegex=true and http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https%3F%3A%2F%2F(x%7Ctwitter).com%2F(%5B%5E%2F%5D%2B)%2Fstatus%2F(d%2B)&searchUseRegex=true
- ✅ If it all works on localhost, make it work on https://zipobject.vercel.app and with that on https://zipobject.com
- ✅ After this, `forgithub.threads`: use OpenAPI to generate forgithub.threads based on https://zipobject.vercel.app, ensuring it only returns the actual tweet urls as typed array.
