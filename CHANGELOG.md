# January 14, 2025

Started the attempt to create a much more general purpose, and improved version of the core tech within uithub: unzipping with filters.

- ✅ Cleanup based on uithub
- ✅ Allow tarballs too
- ✅ Implemented streaming the response
- ✅ Adhere to maxTokens by counting tokens (characters / 5) in the ballstreams, and once it's higher than maxTokens, skip the rest
- ✅ Fix path filter
