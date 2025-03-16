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

io.on("connection", (socket) => {
    console.log("Bir kullanıcı bağlandı.");

    // Yeni bağlanan kullanıcıya toplantının açık olup olmadığını bildir
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

    // (Diğer event listener'lar burada kalacak)

   
    socket.on("startAttendance", () => {
        io.emit("attendanceStarted");
        console.log("Yoklama başladı!");
        isAttendanceStarted = true;
    });

    socket.on("startVoting", () => {
        
        io.emit("votingStarted");
        console.log("Oylama başladı!");
        isVotingStarted = true;
    });

    socket.on("requestToSpeak", (username) => {
        if (!isMeetingStarted) {
            socket.emit("errorMessage", "Toplantı başlamadı!");
            return;
        }
        console.log(`${username} söz istedi.`);
        io.emit("newRequest", { username });
    });

    socket.on("vote", (username, choice) => {
        if (!isVotingStarted) {
            socket.emit("errorMessage", "Oylama başlamadı!");
            return;
        }
        console.log(`${username} oylamada ${choice} dedi.`);
        io.emit("voteResult", { username, choice });
    });

    socket.on("attendance", (username) => {
        if (!isAttendanceStarted) {
            socket.emit("errorMessage", "Yoklama başlamadı!");
            return;
        }
        console.log(`${username} yoklamaya katıldı.`);
        io.emit("attendanceMarked", { username });

    });


    socket.on("approveRequest", (username) => {
    console.log(`${username} söz hakkı onaylandı.`);
    io.emit("requestApproved", { username });
    });

    socket.on("disconnect", () => {
        console.log("Bir kullanıcı ayrıldı.");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor!`));