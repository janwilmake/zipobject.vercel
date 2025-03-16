# Fetch built-in

For `ZipStreamer`, fetch binary data where only a url is present (incase of fileobject input) - max 1000 subrequests and concurrency will be a major limitation here!

# Idea: Separate other streamers

I've made some other streamers but there's an argument of having greater modularity if I would just allow for JSONSequenceStreamer in zipobject, requiring the other streamers to be built on top of that.

Especially making a good HTML streamer is going to be very interesting to get right. If I can somehow have super low paint time, that's very good for usability.

I've tried to create a universal HTML streamer, but it seems a bit optimistic since there are many features I would want in a GitHub HTML streamer. Therefore, it seems more logical to create the HTML streamer inside of forgithub.context, not here.

# Nice to have: Improve zip finding and binary urls

Issue: not all branches are accessible yet on github and this is actually quite some logic! Many will actually give a dead link, which is problematic! Since we have more than zipobject alone for github zip finding, this should become a service or lib in itself. Maybe, its better not to allow github URL in the first place, or at least, we should be very clear on what is supported from the github URL structure and what isn't.

Possible github URLs in browser:

- https://github.com/facebook/react
- https://github.com/facebook/react/tree|blob/main/[path]
- https://github.com/facebook/react/wiki/[page]
- https://github.com/facebook/react/tree/18eaf51bd51fed8dfed661d64c306759101d0bfd
- https://github.com/facebook/react/tree/gh/mvitousek/5/orig/compiler (branch can have strange characters including `/`)
- https://github.com/facebook/react/tree/v16.3.1 (it's a tag)

Two strategies are possible to figure out the zip url and raw url:

1. trial and error; try most likely and try other possibilities later to finally get the zip url. the tricky part is that https://codeload.github.com/facebook/react/zip/refs/ANYTHING will always redirect even if it didn't exist, so we need to follow the redirect.
2. use `git.listServerRefs`. If we cache it and But this easily takes half a second...

It's best to create a function to do this trial and error. This would most likely just be ratelimited by 5000 req/hour/ip. Additionally we could cache the tagnames and branchnames - but not the shas they're tied to. However, I don't think this is worth the additional complexity as the amount of trials before a hit is likely between 2-3 on average (assuming we start with 2 in parallel).
