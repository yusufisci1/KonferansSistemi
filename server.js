require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.json());
app.use(express.static("public"));

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Konferans Sistemi API Çalışıyor!");
});

let isMeetingStarted = false;
let isAttendanceStarted = false;
let isVotingStarted = false;

let hasRequestedToSpeak = {};
let hasJoinedAttendance = {};
let hasJoinedMeeting = {};
let hasVoted = {};

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı.");

  if (isMeetingStarted) socket.emit("meetingStarted");
  if (isAttendanceStarted) socket.emit("attendanceStarted");
  if (isVotingStarted) socket.emit("votingStarted");

  socket.on("startMeeting", () => {
    console.log("Toplantı başladı!");
    io.emit("meetingStarted");
    isMeetingStarted = true;
  });

  socket.on("startAttendance", () => {
    console.log("Yoklama başladı!");
    io.emit("attendanceStarted");
    isAttendanceStarted = true;
  });

  socket.on("startVoting", () => {
    console.log("Oylama başladı!");
    io.emit("votingStarted");
    isVotingStarted = true;
  });

  socket.on("requestToSpeak", (username) => {
    if (!isMeetingStarted) return socket.emit("errorMessage", "Toplantı başlamadı!");
    if (hasRequestedToSpeak[username]) return socket.emit("errorMessage", "Zaten söz istediniz, bekleyin!");
    
    hasRequestedToSpeak[username] = true;
    console.log(`${username} söz istedi.`);
    io.emit("newRequest", { username });
  });

  socket.on("attendance", (username) => {
    if (!isAttendanceStarted) return socket.emit("errorMessage", "Yoklama başlamadı!");
    if (hasJoinedAttendance[username]) return socket.emit("errorMessage", "Zaten yoklamaya katıldınız!");
    
    hasJoinedAttendance[username] = true;
    console.log(`${username} yoklamaya katıldı.`);
    io.emit("attendanceMarked", { username });
  });

  socket.on("joinMeeting", (username) => {
    if (!isMeetingStarted) return socket.emit("errorMessage", "Toplantı başlamadı!");
    if (hasJoinedMeeting[username]) return socket.emit("errorMessage", "Zaten toplantıya katıldınız!");
    
    hasJoinedMeeting[username] = true;
    console.log(`${username} toplantıya katıldı.`);
    io.emit("meetingJoined", { username });
  });

  socket.on("vote", (username, choice) => {
    if (!isVotingStarted) return socket.emit("errorMessage", "Oylama başlamadı!");
    if (hasVoted[username]) return socket.emit("errorMessage", "Zaten oy kullandınız!");
    
    hasVoted[username] = true;
    console.log(`${username} oylamada ${choice} dedi.`);
    io.emit("voteResult", { username, choice });
  });

  socket.on("approveRequest", (username) => {
    console.log(`${username} söz hakkı onaylandı.`);
    hasRequestedToSpeak[username] = false;
    io.emit("requestApproved", { username });
  });

  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı..");
  //  hasRequestedToSpeak[username] = false;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor!`));