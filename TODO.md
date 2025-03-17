# Ship functional zipobject with regex search

- ✅ Add new functionality for path search
- ✅ Implement search with options into tarballStream and zipballStream.
- ✅ Make it run again and test it using some URL that works
- ✅Test this with the content search regex for a tweet and path regex of `*.md`. Confirm that works
- ✅ Deploy
- ✅ make this work: http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https?://(x|twitter)\.com/([^/]+)/status/(\d+)&searchUseRegex=true&pathPatterns=_.md,_.ts
- ✅ Allow admin apiKey via GET and test http://zipobject.vercel.app. Fix crash there.
- ✅ If it all works on there, make it work on zipobject.com too.
- URLEncoded regex does not work for some reason. Figure out the difference between http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https?://(x|twitter)\.com/([^/]+)/status/(\d+)&searchUseRegex=true and http://localhost:3001/github.com/janwilmake/cloudflare-sponsorware?accept=application/json&search=https%3F%3A%2F%2F(x%7Ctwitter).com%2F(%5B%5E%2F%5D%2B)%2Fstatus%2F(d%2B)&searchUseRegex=true
- If it all works on localhost, make it work on https://zipobject.vercel.app and with that on https://zipobject.com

After this, `forgithub.threads`: use OpenAPI to generate forgithub.threads based on https://zipobject.vercel.app, ensuring it only returns the actual tweet urls as typed array.

# Some bugs

- exclude-dir bug: https://x.com/jhogervorst/status/1900128634926514640
- Bug with spaces: https://x.com/janwilmake/status/1898753253988253946
- Ensure the thing doesn't crash when files are empty (or other reasons)

# MVP

- Binary urls for private repos: These should not use the raw.githubusercontent, but rather `zipboject.com/file`. Either that or ensure its clear how to access with raw.githubusercontent. can still be done with api key i guess and maybe it's just best.
- Ensure zipobject doesn't cache private repos! This may be a challenge. How to know this!? Look at zip location
- Public repos is as cheap as possible (see cost vercel), private repos cost is 10x (profit is here). We can do this if we add a `x-is-private-resource` response header.

# `/file` endpoint

Make https://file.zipobject.com work, or zipobject.com/file (to get a specific file)

`/file` was an endpoint that used a responded with a single file. Was needed for githuq/githus to show the file in the right mediatype, hence `mime-types` package. Should be a zipobject feature, especially cool with range request.

In forgithub.context, it should be called when page is `blob`, but in zipobject it's a separate endpoint.

In forgithub.context, proxy `owner/repo/blob/...` to `/file`.
