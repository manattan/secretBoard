"use strict";

{
  //Node.jsのモジュールで、暗号化できる関数が色々実装されている
  const crypto = require("crypto");
  //その他色々、テンプレートエンジンなど
  const pug = require("pug");
  const Cookies = require("cookies");
  const moment = require("moment-timezone"); //時間の表示を変えるためにインストールしたモジュール
  const util = require("./handlerUtil");
  const Post = require("./post");

  const trackingIdKey = "tracking_id";

  //ワンタイムトークンの導入 キーをユーザー名,値をトークンとする連想配列
  const oneTimeTokenMap = new Map();

  function handle(req, res) {
    const cookies = new Cookies(req, res);
    const trackingId = addTrackingCoolie(cookies, req.user);

    switch (req.method) {
      case "GET":
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
        });
        Post.findAll({ order: [["id", "DESC"]] }).then((posts) => {
          posts.forEach((post) => {
            post.content = post.content.replace(/\+/g, " ");
            post.formattedCreatedAt = moment(post.createdAt)
              .tz("Asia/Tokyo")
              .format("YYYY年MM月DD日 HH時mm分ss秒");
          });
          const oneTimeToken = crypto.randomBytes(8).toString("hex");
          oneTimeTokenMap.set(req.user, oneTimeToken);
          res.end(
            pug.renderFile("./views/posts.pug", {
              posts: posts,
              user: req.user,
              oneTimeToken: oneTimeToken,
            })
          );
          console.info(
            `閲覧されました: user: ${req.user}, ` +
              `trackingId: ${trackingId}, ` +
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

            //decodedが content=投稿内容&oneTimeToken=トークン値 となっているので、それぞれを抽出
            const dataArray = decoded.split("&");
            const content = dataArray[0]
              ? dataArray[0].split("content=")[1]
              : "";
            const requestedOneTimeToken = dataArray[1]
              ? dataArray[1].split("oneTimeToken=")[1]
              : "";

            //連想配列に格納されているワンタイムトークンとリクエストされたワンタイムトークンが同じ場合にのみ投稿をデータベースに保存
            if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
              console.info("投稿されました: " + content);

              //データベースに保存
              Post.create({
                content: content,
                trackingCookie: trackingId,
                postedBy: req.user,
              }).then(() => {
                oneTimeTokenMap.delete(req.user);
                handleRedirectPosts(req, res);
              });
            } else {
              util.handleBadRequest(req, res);
            }
          });
        break;
      default:
        util.handleBadRequest(req, res);
        break;
    }
  }

  //投稿を削除
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

            //decodedが id=id値&oneTimeToken=トークン値 となっているので、それぞれを抽出
            const dataArray = decoded.split("&");
            const id = dataArray[0] ? dataArray[0].split("id=")[1] : "";
            const requestedOneTimeToken = dataArray[1]
              ? dataArray[1].split("oneTimeToken=")[1]
              : "";
            if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
              Post.findById(id).then((post) => {
                if (req.user === post.postedBy || req.user === "admin") {
                  post.destroy().then(() => {
                    oneTimeTokenMap.delete(req.user);
                    handleRedirectPosts(req, res);
                  });
                }
              });
            } else {
              util.handleBadRequest(req, res);
            }
          });
        break;
      default:
        util.handleBadRequest(req, res);
        break;
    }
  }

  //トラッキングIDに異常がなければそのまま返し、異常なら再度生成し付与
  function addTrackingCoolie(cookies, userName) {
    const requestedTrackingId = cookies.get(trackingIdKey);
    if (isValidTrackingId(requestedTrackingId, userName)) {
      return requestedTrackingId;
    } else {
      const originalId = parseInt(crypto.randomBytes(8).toString("hex"), 16);
      const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const trackingId =
        originalId + "_" + createValidHash(originalId, userName);
      cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
      return trackingId;
    }
  }

  //そのトラッキングIDが正しいか検証
  function isValidTrackingId(trackingId, userName) {
    //trackingIdがnullとかだったらfalseを返す
    if (!trackingId) {
      return false;
    }
    const splitted = trackingId.split("_");
    const originalId = splitted[0];
    const requestedHash = splitted[1];
    return createValidHash(originalId, userName) === requestedHash;
  }

  //トラッキングIDとユーザー名を結合させてHash
  function createValidHash(originalId, userName) {
    const sha1sum = crypto.createHash("sha1");
    const secretKey = crypto.randomBytes(256).toString("hex");
    sha1sum.update(originalId + userName + secretKey);
    return sha1sum.digest("hex");
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
