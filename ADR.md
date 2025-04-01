With zipobject, I'm actually creating a CDN for github, npm, jsr, and any other zip location. However it seems I'm doing something more fundamental.

I'm in the same market as:

- https://unpkg.com (cdn for npmjs)
- https://www.jsdelivr.com (cdn for npm, esm, github)
- https://cdnjs.com
- https://www.skypack.dev
- https://esm.sh

Especially jsdelivr functionality comes close!

- They even have a tree endpoint: https://www.jsdelivr.com/docs/data.jsdelivr.com#get-/v1/packages/gh/-user-/-repo-@-version- with a very different datastructure! Tree or flat, but ugly as fuck!
- They have an entrypoints endpoint using package.json metadata and 'additional heuristics': https://www.jsdelivr.com/docs/data.jsdelivr.com#get-/v1/packages/npm/-package-@-version-/entrypoints
- They have a whole bunch of package stats endpoints, focusing mostly on bandwidth and usage (not stars or other activity). Also their usage anlytics are all public showing countries, browsers, etc. Very interesting!

However, all of the above focus on serving single files mostly, and don't have easy-to-use endpoints to get it all in one go. That's what makes zipobject interesting. Furthermore, the filtering and search is something completely new.

# Gitlab support

Gitlab zip archives requests don't get accepted from vercel - see `gitlab.test.ts`; https://github.com/vercel/vercel/issues/13033

# Moving to cloudflare

It's not worth replacing swc with acorn and running zipjs in a Durable object even though this could allow me to migrate to cloudflare from vercel. Rather than that, just use free vercel for now and start paying if it gets too much. The business should evolve if it can ask questions!

Update 2025-04-01; workers can now be set to have a max CPU time of up to 5 minutes (from 30 seconds) which should simplify the solution by A LOT. Also the idea now is to put swc at `swc.uithub.com` as a plugin that does this part for every file.

Therefore, it's probably worth it now, if I have time! It's good to do since this is really the core that I want to make cheap and everything else relies on. Good for speed and cost.

# Regexes in a GET request

It's hard to put them in a GET request as encoding/decoding fuck up the backslash (`\`) so to ensure it works and keeps working I figured it's better to use a different encoding/decoding method. With base64 (atob/btoa) it works fine!
