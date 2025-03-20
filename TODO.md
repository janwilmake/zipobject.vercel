# Some bugs

- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- Ensure the thing doesn't crash when files are empty (or other reasons), and never outputs incorrect JSON

# MVP

- Binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`. Either that or ensure its clear how to access with raw.githubusercontent. can still be done with api key i guess and maybe it's just best.
- Ensure zipobject doesn't cache private repos! This may be a challenge. How to know this!? Is private repo zip location different?
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here). We can do this if we add a `x-is-private-resource` response header.

# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.

# Zipobject as API Product

- Provide programmatic way to login and get API key, and document this in the OpenAPI. It's probably good to add this into sponsorflare as well.
- Provide programmatic way to retrieve usage and show this in a table on per-month basis as well as last 14 days on a per-day basis in a graph.
- Provide ability to create/rotate api key, and ensure the api key is not the same as the key you login with, but a key specifically made for API use.

After this is there, this'd be a great thing to show to people, as a minimal example of how to build a paid API with Cloudflare.
