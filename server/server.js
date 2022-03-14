const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const port = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("A new Connection made", socket.id);

  socket.on("sendMessage", (messageInfo) => {
    let messageList = require("./data/messageList.json");
    messageList.push(messageInfo.messageData);

    let previousTextMessage = null;
    for (let i = messageList.length - 2; i >= 0; i--) {
      if (messageInfo.messageData.userId !== messageList[i].userId) break;
      if (messageList[i].message) {
        previousTextMessage = messageList[i];
        break;
      }
    }
    if (previousTextMessage) {
      const currentMessageTime = messageInfo.messageData.timestamp;
      const previousMessageTime = previousTextMessage.timestamp;
      if ((currentMessageTime - previousMessageTime) / (1000 * 60) < 2)
        previousTextMessage.showUserInfo = false;
    }
    fs.writeFileSync(
      path.join(__dirname, "/data", "/messageList.json"),
      JSON.stringify(messageList)
    );
    messageList = fs.readFileSync(
      path.join(__dirname, "/data", "/messageList.json"),
      "utf-8"
    );
    io.emit("checkMessageSync", JSON.parse(messageList));
  });

  socket.on("newMemberJoined", (payload) => {
    let messageList = require("./data/messageList.json");
    messageList.push({ type: "information", userInfo: payload });
    fs.writeFileSync(
      path.join(__dirname, "/data", "/messageList.json"),
      JSON.stringify(messageList)
    );
    messageList = fs.readFileSync(
      path.join(__dirname, "/data", "/messageList.json"),
      "utf-8"
    );
    socket.emit("previousChat", JSON.parse(messageList));
    socket.broadcast.emit("newMemberJoined", payload);
  });

  socket.on("userInfo", function (userInfo) {
    let userList = require("./data/userList.json");
    userList.push(userInfo.currentUser);
    fs.writeFileSync(
      path.join(__dirname, "/data", "/userList.json"),
      JSON.stringify(userList)
    );
    userList = fs.readFileSync(
      path.join(__dirname, "/data", "/userList.json"),
      "utf-8"
    );
    io.emit("memberList", JSON.parse(userList));
  });

  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
    io.emit("animateMemberList", user);
  });

  socket.on("manual-disconnection", function (data) {
    console.log("User Manually Disconnected. \n\tTheir ID: " + data);
  });

  socket.on("disconnect", function (reason) {
    console.log("user disconnected", socket.id, reason);
  });

  socket.on("connect", (payload) => {
    console.log("user Connected", socket.id, payload);
  });
});

app.get("/", (req, res) => {
  console.log("request received");
  res.send("hola");
});

server.listen(port, () => {
  console.log(`server listening on ${port}`);
});
