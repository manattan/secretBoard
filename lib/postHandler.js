"use strict";

{
  const pug = require("pug");
  const Cookies = require("cookies");
  const util = require("./handlerUtil");
  const Post = require("./post");

  const trackingIdKey = "tracking_id";

  function handle(req, res) {
    const cookies = new Cookies(req, res);
    addTrackingCoolie(cookies);

    switch (req.method) {
      case "GET":
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
        });
        Post.findAll({ order: [["id", "DESC"]] }).then((posts) => {
          posts.forEach((post) => {
            post.content = post.content.replace(/\n/g, "<br>");
          });
          res.end(
            pug.renderFile("./views/posts.pug", {
              posts: posts,
              user: req.user,
            })
          );
          console.info(
            `閲覧されました: user: ${req.user}, ` +
              `trackingId: ${cookies.get(trackingIdKey)}, ` +
              `remoteAddress: ${req.connection.remoteAddress}, ` +
              `userAgent: ${req.headers["user-agent"]}`
          );
        });
        break;
      case "POST":
        let body = [];
        req
          .on("data", (chunk) => {
            body.push(chunk);
          })
          .on("end", () => {
            body = Buffer.concat(body).toString();
            const decoded = decodeURIComponent(body);
            const content = decoded.split("content=")[1];
            console.info("投稿されました: " + content);

            //データベースに保存
            Post.create({
              content: content,
              trackingCookie: cookies.get(trackingIdKey),
              postedBy: req.user,
            }).then(() => {
              handleRedirectPosts(req, res);
            });
          });
        break;
      default:
        util.handleBadRequest(req, res);
        break;
    }
  }

  function handleDelete(req, res) {
    switch (req.method) {
      case "POST":
        let body = [];
        req
          .on("data", (chunk) => {
            body.push(chunk);
          })
          .on("end", () => {
            body = Buffer.concat(body).toString();
            const decoded = decodeURIComponent(body);
            const id = decoded.split("id=")[1];
            Post.findById(id).then((post) => {
              if (req.user === post.postedBy || user === "admin") {
                post.destroy().then(() => {
                  handleRedirectPosts(req, res);
                });
              }
            });
          });
        break;
      default:
        util.handleBadRequest(req, res);
        break;
    }
  }

  //
  function addTrackingCoolie(cookies) {
    if (!cookies.get(trackingIdKey)) {
      const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
      cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    }
  }

  //再読み込みさせる
  function handleRedirectPosts(req, res) {
    res.writeHead(303, {
      Location: "/posts",
    });
    res.end();
  }

  module.exports = {
    handle,
    handleDelete,
  };
}