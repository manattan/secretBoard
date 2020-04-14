"use strict";

{
  const postHandler = require("./postHandler");
  const util = require("./handlerUtil");

  function route(req, res) {
    switch (req.url) {
      case "/posts":
        postHandler.handle(req, res);
        break;
      case "/posts?delete=1":
        postHandler.handleDelete(req, res);
        break;
      case "/logout":
        util.handleLogout(req, res);
        break;
      default:
        util.handleNotFound(req, res);
        break;
    }
  }
  module.exports = {
    route,
  };
}