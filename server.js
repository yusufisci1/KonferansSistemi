require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("./config/db");
const userRoutes = require("./routes/userRoutes"); // Kullanıcı rotalarını ekledik

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.json()); // JSON formatında gelen verileri okuyabilmek için
app.use(express.static("public")); // Public klasörünü aç

// Kullanıcı Giriş API
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Konferans Sistemi API Çalışıyor!");
});

let isMeetingStarted = false;  //Toplantı
let isAttendanceStarted = false; //Yoklama
let isVotingStarted = false; //Oylama

let hasRequestedToSpeak = {}; // Söz isteyen kullanıcıları takip et
let hasJoinedAttendance = {}; // Yoklamaya katılanları takip et
let hasJoinedMeeting = {}; // Toplantıya katılanları takip et
let hasVoted = {};

io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı.");

    // Yeni bağlanan kullanıcıya mevcut oturum durumlarını bildir
    if (isMeetingStarted) {
        socket.emit("meetingStarted");
    }
    if (isAttendanceStarted) {
        socket.emit("attendanceStarted");
    }
    if (isVotingStarted) {
        socket.emit("votingStarted");
    }

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

    // Söz isteme
    socket.on("requestToSpeak", (username) => {
        if (!isMeetingStarted) {
            socket.emit("errorMessage", "Toplantı başlamadı!");
            return;
        }
        if (hasRequestedToSpeak[username]) {
            socket.emit("errorMessage", "Zaten söz istediniz, bekleyin!");
            return;
        }
        hasRequestedToSpeak[username] = true; // Kullanıcıya söz hakkı isteme kaydı ekle
        console.log(`${username} söz istedi.`);
        io.emit("newRequest", { username });
    });

    // Yoklama katılımı
    socket.on("attendance", (username) => {
        if (!isAttendanceStarted) {
            socket.emit("errorMessage", "Yoklama başlamadı!");
            return;
        }
        if (hasJoinedAttendance[username]) {
            socket.emit("errorMessage", "Zaten yoklamaya katıldınız!");
            return;
        }
        hasJoinedAttendance[username] = true;
        console.log(`${username} yoklamaya katıldı.`);
        io.emit("attendanceMarked", { username });
    });

    // Toplantıya katılım
    socket.on("joinMeeting", (username) => {
        if (!isMeetingStarted) {
            socket.emit("errorMessage", "Toplantı başlamadı!");
            return;
        }
        if (hasJoinedMeeting[username]) {
            socket.emit("errorMessage", "Zaten toplantıya katıldınız!");
            return;
        }
        hasJoinedMeeting[username] = true;
        console.log(`${username} toplantıya katıldı.`);
        io.emit("meetingJoined", { username });
    });

    // Oylama
    socket.on("vote", (username, choice) => {
        if (!isVotingStarted) {
            socket.emit("errorMessage", "Oylama başlamadı!");
            return;
        }
        if (hasVoted[username]) {
            socket.emit("errorMessage", "Zaten oy kullandınız!");
            return;
        }
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
        console.log("Bir kullanıcı ayrıldı.");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor!`));