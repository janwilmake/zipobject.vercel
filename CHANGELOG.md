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
