export const GET = async () => {
  const url =
    "https://gitlab.com/gitlab-com/content-sites/handbook/-/archive/main/handbook-main.zip?random=" +
    Math.random();

  console.log({ url });
  const response = await fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.log(res.ok, res.status, { text });
      }
      res.headers.forEach((value, key) => console.log({ key, value }));

      console.log(res.ok, res.status);
    })
    .catch((error) => {
      console.log("Error:", error);
      // Also try to get the response details if available
      if (error instanceof Response) {
        error.text().then((text) => console.log("Error response:", text));
      }
    });
  return new Response("OK?");
};

// export default {
//   fetch: GET,
// };
