"use strict";

{
  function handleLogout(req, res) {
    res.writeHead(401, {
      "Content-Type": "text/html; charset=utf-8",
    });
    console.info("ログアウトしました");
    res.end(
      '<!DOCTYPE html><html lang="ja"><body>' +
        "<h1>ログアウトしました</h1>" +
        '<a href="/posts">ログイン</a>' +
        "</body></html>"
    );
  }

  function handleNotFound(req, res) {
    res.writeHead(404, {
      "Content-Type": "text/html; charset=utf-8",
    });
    console.info("ページが見つかりません");
    res.end("<h1>404- Not Found</h1>");
  }

  function handleBadRequest() {
    res.writeHead(400, {
      "Content-Type": "text/html; charset=utf-8",
    });
    console.info("未対応のメソッドです");
    res.end("<h1>400 - Bad Request</h1>");
  }

  module.exports = {
    handleLogout,
    handleNotFound,
    handleBadRequest,
  };
}
