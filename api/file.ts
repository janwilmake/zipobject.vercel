export const GET = (request: Request) => {
  const url = new URL(request.url);
  const [encodedZipUrl, _, ...chunks] = url.pathname.split("/").slice(2);
  const zipUrl = decodeURIComponent(encodedZipUrl);
  const path = chunks.join("/");

  return new Response(
    "TODO: Get raw file here by stopping after its found. \n\n" +
      zipUrl +
      "\n\n" +
      path,
  );
};
