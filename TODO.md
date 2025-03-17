# Some bugs

- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- Ensure the thing doesn't crash when files are empty (or other reasons)

# MVP

- Binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`. Either that or ensure its clear how to access with raw.githubusercontent. can still be done with api key i guess and maybe it's just best.
- Ensure zipobject doesn't cache private repos! This may be a challenge. How to know this!? Is private repo zip location different?
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here). We can do this if we add a `x-is-private-resource` response header.

# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.
