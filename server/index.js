// {{const express = require("express");
// const http = require("http");
// const app = express();
// const server = http.createServer(app);
// const socket = require("socket.io");
// const io = socket(server);

// let users = [];

// io.on('connection', (socket) => {
//     socket.on("join server", (username) => {
//         const user = {
//             username,
//             id: socket.id,
//         };
//         users.push(user);
//         io.emit("new user", users);
//     });
//     socket.on("join room", (roomName, cb) => {
//         socket.join(roomName);
//         cb(messages[roomName]);
        
//     });
   
// });

// server.listen(1337, () => console.log("Server running on port 1337"));}}