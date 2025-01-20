export const GET = (request: Request) => {
  const url = new URL(request.url);
  const [encodedZipUrl, _, ...chunks] = url.pathname.split("/").slice(2);
  const zipUrl = decodeURIComponent(encodedZipUrl);
  const path = chunks.join("/");

  return new Response(
    "TODO: Raw file here by doing range request on zipobject: \n\n" +
      zipUrl +
      "\n\n" +
      path,
  );
};
