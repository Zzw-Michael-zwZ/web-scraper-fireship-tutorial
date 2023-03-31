const http = require("http");
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const cheerio = require("cheerio");
const getUrls = require("get-urls");

const scrapeMetaTags = (text) => {
  const urls = Array.from(getUrls(text));

  const request = urls.map(async (url) => {
    const res = await fetch(url);
    const html = await res.text();
    //$ = function that allows you to select doms with a selector
    const $ = cheerio.load(html);

    const getMetaTag = (name) => {
      $(`meta[name=${name}]`).attr("content");
      $(`meta[property="og:${name}"]`).attr("content");
      $(`meta[property="twitter:${name}"]`).attr("content");
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

exports.scraper = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const body = JSON.parse(request.body);
    const data = await scrapeMetaTags(body.text);

    response.end(data);
  });
});

http
  .createServer((request, response) => {
    // Set CORS headers
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    cors(request, response, async () => {
      const body = JSON.parse(request.body);
      const data = await scrapeMetaTags(body.text);

      response.end(data);
    });

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    let requestBody = "";
    request.on("data", (chunk) => {
      requestBody += chunk;
    });
    request.on("end", async () => {
      const body = JSON.parse(requestBody);
      const data = await scrapeMetaTags(body.text);
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(data));
    });
  })
  .listen(3000);

console.log("Server running at http://localhost:3000/");
