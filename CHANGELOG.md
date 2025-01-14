# January 14, 2025

Started the attempt to create a much more general purpose, and improved version of the core tech within uithub: unzipping with filters.

- ✅ Cleanup based on uithub
- ✅ Allow tarballs too
- ✅ Implemented streaming the response
- ✅ Adhere to maxTokens by counting tokens (characters / 5) in the ballstreams, and once it's higher than maxTokens, skip the rest
- Look to see if we can make this do range request: https://www.npmjs.com/package/unzipper otherwise, move to https://www.npmjs.com/package/@zip.js/zip.js/v/2.6.40
