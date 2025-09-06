const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, "data.json");

// Initialize data.json
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify({ users: [], servers: [], messages: [] }, null, 2)
  );
}

// Helpers
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH));
const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// --- REST API ---
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send("Username required");

  const data = readData();
  let user = data.users.find((u) => u.username === username);
  if (!user) {
    user = { id: data.users.length + 1, username };
    data.users.push(user);
    writeData(data);
  }
  res.json(user);
});

app.get("/servers", (req, res) => {
  const data = readData();
  res.json(data.servers);
});

app.post("/servers", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).send("Server name required");

  const data = readData();
  const serverObj = { id: data.servers.length + 1, name, channels: [{ id: 1, name: "general" }] };
  data.servers.push(serverObj);
  writeData(data);
  res.json(serverObj);
});

app.get("/messages/:serverId/:channelId", (req, res) => {
  const { serverId, channelId } = req.params;
  const data = readData();
  const msgs = data.messages.filter(
    (m) => m.serverId == serverId && m.channelId == channelId
  );
  res.json(msgs);
});

// --- WebSocket ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", ({ serverId, channelId }) => {
    const room = `${serverId}_${channelId}`;
    socket.join(room);
    console.log(`Joined room: ${room}`);
  });

  socket.on("send_message", (msg) => {
    const data = readData();
    data.messages.push(msg);
    writeData(data);
    const room = `${msg.serverId}_${msg.channelId}`;
    io.to(room).emit("receive_message", msg);
  });

  socket.on("disconnect", () => console.log("User disconnected:", socket.id));
});

// Render-ready port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
