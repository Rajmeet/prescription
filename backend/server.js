// const express = require("express");
// const WebSocket = require("ws");
// const app = express();
// const port = 3000;

// // WEBSOCKET STUFF BEGIN

// const ws = new WebSocket("ws://www.localhost:3001");

// ws.on("error", console.error);

// ws.on("open", function open() {
//   ws.send("something");
// });

// ws.on("message", function message(data) {
//   console.log("received: %s", data);
// });

// // WEBSOCKET STUFF END

// app.get("/getWebRTC", (req, res) => {
//   res.send("This is the base endpoint");
// });

// app.listen(port, () => {
//   console.log(`New user has connected`);
// });

var express = require("express");
var app = express();
var expressWs = require("express-ws")(app);

app.use(function (req, res, next) {
  console.log("middleware");
  req.testing = "testing";
  return next();
});

const ws = expressWs.getWss();

app.get("/", function (req, res, next) {
  console.log("get route", req.testing);
  res.send("This is being sent back");
});

app.ws("/", function (ws, req) {
  ws.on("open", function open() {
    console.log("A connection to the web socket has been made.");
    ws.send("something");
  });
  ws.on("message", function (msg) {
    console.log(msg);
    ws.send("Receiving your connetcion!");
  });
  console.log("socket", req.testing);
});

app.listen(3000);
