const http = require("http");
const cors = require("cors")({ origin: true });
const cheerio = require("cheerio");
const getUrls = require("get-urls");
const fetch = require("node-fetch");

const scrapeMetaTags = (text) => {
  const urls = Array.from(getUrls(text));

  const request = urls.map(async (url) => {
    const res = await fetch(url);
    const html = await res.text();
    //$ = function that allows you to select doms with a selector
    const $ = cheerio.load(html);

    const getMetaTag = (name) => {
      const value =
        $(`meta[name=${name}]`).attr("content") ||
        $(`meta[property="og:${name}"]`).attr("content") ||
        $(`meta[property="twitter:${name}"]`).attr("content");
      return value;
    };

    return {
      url,
      title: $("title").first().text(),
      favicon: $('link[rel="shortcut icon"]').attr("href"),
      description: getMetaTag("description"),
      image: getMetaTag("image"),
      author: getMetaTag("author"),
    };
  });

  return Promise.all(request);
};

const server = http.createServer((req, res) => {
  cors(req, res, async () => {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        const data = await scrapeMetaTags(JSON.parse(body).text);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      });
    } else {
      res.statusCode = 405;
      res.end();
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
