# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.

# MVP

- Add new functionality for includeFiles, excludeFiles, search, matchCase, useRegex
- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`
- Ensure the thing doesn't crash when files are empty (or other reasons)

# Zipobject Monetisation

- Zipobject vercel should just be admin-authorized https://zipobject.vercel.app, whereas zipobject.com should be at cloudflare and proxy it with monetisation looking at response content size and charge $0.20/GB.
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here)
- Ensure zip URL authorization can be provided in `X-ZIP-Authorization` header only.

# Broadening filters with cache

Figure out a way to also look for incrementally broadening filters to see if we have a broader filter cached

Having this allows direct doc viewing from uithub, but much faster (replacing https://docs.uithub.com logic)

To not decrease speed, add a waitUntil that schedules execution of the same URL but rather streams to cache it, and doesn't have a regular response. Create schedule.boncron.com for this.

Place R2 in same place as the Vercel function: WEUR so it's fast with cache.

❗️ Ensure zipobject doesn't cache private repos! This may be a challenge. ❗️

# Parsing

When parsing typescript Env or other interfaces, also parse non-references incase it's a primitive such as string,number,boolean.
