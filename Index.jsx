import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";

const BACKEND_URL = "https://web-xkpj.onrender.com"; // <-- replace with your Render URL
const socket = io(BACKEND_URL);

function App() {
  const [username, setUsername] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [newServerName, setNewServerName] = useState("");

  // Login
  const login = async () => {
    if (!username) return;
    await axios.post(`${BACKEND_URL}/login`, { username });
    setLoggedIn(true);
    fetchServers();
  };

  const fetchServers = async () => {
    const res = await axios.get(`${BACKEND_URL}/servers`);
    setServers(res.data);
    if (res.data.length > 0) selectServer(res.data[0]);
  };

  const createServer = async () => {
    if (!newServerName) return;
    const res = await axios.post(`${BACKEND_URL}/servers`, { name: newServerName });
    setServers([...servers, res.data]);
    setNewServerName("");
  };

  const selectServer = (server) => {
    setSelectedServer(server);
    if (server.channels.length > 0) selectChannel(server.channels[0]);
  };

  const selectChannel = async (channel) => {
    setSelectedChannel(channel);
    socket.emit("join_room", { serverId: selectedServer.id, channelId: channel.id });
    const res = await axios.get(`${BACKEND_URL}/messages/${selectedServer.id}/${channel.id}`);
    setMessages(res.data);
  };

  const sendMessage = () => {
    if (!message) return;
    const msg = {
      id: Date.now(),
      username,
      text: message,
      serverId: selectedServer.id,
      channelId: selectedChannel.id,
    };
    socket.emit("send_message", msg);
    setMessage("");
  };

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      if (msg.serverId === selectedServer?.id && msg.channelId === selectedChannel?.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });
  }, [selectedServer, selectedChannel]);

  if (!loggedIn)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <input
          className="border p-2 mb-4"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button className="bg-blue-500 text-white p-2" onClick={login}>
          Login
        </button>
      </div>
    );

  return (
    <div className="flex h-screen">
      <div className="w-1/5 bg-gray-800 text-white p-2">
        <h2 className="font-bold mb-2">Servers</h2>
        {servers.map((s) => (
          <div
            key={s.id}
            className={`p-2 cursor-pointer ${selectedServer?.id === s.id ? "bg-gray-600" : ""}`}
            onClick={() => selectServer(s)}
          >
            {s.name}
          </div>
        ))}
        <input
          className="border p-1 mt-2 w-full"
          placeholder="New Server"
          value={newServerName}
          onChange={(e) => setNewServerName(e.target.value)}
        />
        <button className="bg-green-500 w-full mt-1 p-1" onClick={createServer}>
          Create
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-gray-900 text-white">
        <div className="flex bg-gray-700 p-2">
          {selectedServer?.channels.map((c) => (
            <div
              key={c.id}
              className={`p-2 cursor-pointer ${selectedChannel?.id === c.id ? "bg-gray-500" : ""}`}
              onClick={() => selectChannel(c)}
            >
              #{c.name}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {messages.map((m) => (
            <div key={m.id}>
              <b>{m.username}:</b> {m.text}
            </div>
          ))}
        </div>

        <div className="p-2 flex">
          <input
            className="flex-1 border p-2 mr-2"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button className="bg-green-500 p-2" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
