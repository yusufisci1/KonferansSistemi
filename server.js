require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/user"); // Kullanıcı modelini içe aktar
const connectedUsers = {}; // 📌 Kullanıcıları takip eden nesne (Global olarak tanımlandı!)
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
// 📌 Log dosyasının yolu
const logFilePath = path.join(__dirname, "logs", "logs.txt");

// 📌 Eğer logs klasörü yoksa oluştur
if (!fs.existsSync(path.join(__dirname, "logs"))) {
    fs.mkdirSync(path.join(__dirname, "logs"));
}

// 📌 Orijinal console.log fonksiyonunu sakla
const originalConsoleLog = console.log;

// 📌 Yeni console.log fonksiyonu (Logları hem terminale hem dosyaya kaydeder)
console.log = function (message) {
    const logMessage = `[${new Date().toLocaleString()}] ${message}\n`;

    // Terminale yazdır
    originalConsoleLog(logMessage);

    // 📌 logs.txt dosyasına ekle (hata olursa terminale yazdır)
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            originalConsoleLog("❌ Log dosyasına yazılırken hata oluştu:", err);
        }
    });
};

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
 
 // console.log("Bir kullanıcı bağlandı.");

 socket.on("userConnected", ({ username }) => {
  if (username) {
      connectedUsers[socket.id] = username; // Kullanıcı adını socket.id ile eşleştir
      console.log(`Kullanıcı bağlandı: ${username}`);
      socket.emit("welcomeMessage", `👋 Hoş geldin, ${username}!`);
  } else {
      console.log("⚠️ Kullanıcı adı alınamadı!");
  }
});

  if (isMeetingStarted) socket.emit("meetingStarted");
  if (isAttendanceStarted) socket.emit("attendanceStarted");
  if (isVotingStarted) socket.emit("votingStarted");

  socket.on("startMeeting", () => {
    console.log("Toplantı başladı!");
    io.emit("meetingStarted");
    isMeetingStarted = true;
  });

  socket.on("endMeeting", () => {
    console.log("Toplantı sona erdi!");
     hasRequestedToSpeak = {}; // Tüm söz taleplerini sil
    // Tüm istemcilere toplantının bittiğini ve konuşma isteklerinin sıfırlandığını bildir
    io.emit("meetingEnded");
    io.emit("updatedRequests", []); // Başkan panelindeki listeyi sıfırla
    // Toplantıyı sıfırla
    isMeetingStarted = false;
});

  socket.on("startAttendance", () => {
    console.log("Yoklama başladı!");
    io.emit("attendanceStarted");
    isAttendanceStarted = true;
  });

  socket.on("endAttendance", () => {
    console.log("Yoklama sona erdi! PDF oluşturuluyor...");

    if (Object.keys(hasJoinedAttendance).length > 0) {
        const doc = new PDFDocument();
        const now = new Date();
        const formattedDate = now.toLocaleString("tr-TR"); // Türkçe tarih formatı
        const filePath = `public/reports/yoklama_${Date.now()}.pdf`;

        doc.pipe(fs.createWriteStream(filePath));
        doc.fontSize(20).text("Yoklama Listesi", { align: "center" });
        doc.fontSize(12).text(`Tarih: ${formattedDate}`, { align: "center" }); // Zamanı ekle
        doc.moveDown();

        Object.keys(hasJoinedAttendance).forEach((username, index) => {
            doc.fontSize(14).text(`${index + 1}. ${username}`);
        });

        doc.end();
        console.log(`Yoklama listesi PDF olarak kaydedildi: ${filePath}`);
    }

    // Listeyi temizle
    hasJoinedAttendance = {};
    io.emit("attendanceEnded");
    io.emit("updatedAttendance", []);
    // Yoklama durumunu sıfırla
    isAttendanceStarted = false;
});

  socket.on("startVoting", () => {
    console.log("Oylama başladı!");
    io.emit("votingStarted");
    isVotingStarted = true;
  });

  socket.on("endVoting", () => {
    console.log("Oylama sona erdi! PDF oluşturuluyor...");

    if (Object.keys(hasVoted).length > 0) {
        const doc = new PDFDocument();
        const now = new Date();
        const formattedDate = now.toLocaleString("tr-TR"); // Türkçe tarih formatı
        const filePath = `public/reports/oylama_${Date.now()}.pdf`;

        doc.pipe(fs.createWriteStream(filePath));
        doc.fontSize(20).text("Oylama Sonuçları", { align: "center" });
        doc.fontSize(12).text(`Tarih: ${formattedDate}`, { align: "center" }); // Zamanı ekle
        doc.moveDown();

        Object.entries(hasVoted).forEach(([username, choice], index) => {
            doc.fontSize(14).text(`${index + 1}. ${username}: ${choice}`);
        });

        doc.end();
        console.log(`Oylama sonuçları PDF olarak kaydedildi: ${filePath}`);
    }

    // Listeyi temizle
    hasVoted = {};
    io.emit("votingEnded");
    io.emit("updatedVotes", []);
   // Oylama durumunu sıfırla
    isVotingStarted = false;
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
    
    hasVoted[username] = choice;
    console.log(`${username} oylamada ${choice} dedi.`);
    io.emit("voteResult", { username, choice });
  });

  socket.on("approveRequest", (username) => {
    console.log(`${username} söz hakkı onaylandı.`);
    hasRequestedToSpeak[username] = false;
    io.emit("requestApproved", { username });
  });

  socket.on("disconnect", () => {
    const username = connectedUsers[socket.id]; // Ayrılan kullanıcının adını bul
    if (username) {
        console.log(`Kullanıcı ayrıldı: ${username}`);
        delete connectedUsers[socket.id]; // Kullanıcıyı listeden kaldır
    } else {
     //   console.log(`Bilinmeyen bir kullanıcı ayrıldı (Socket ID: ${socket.id})`);
    }
   
  });


  socket.on("addParticipant", async (data) => {
    try {
        const { username, password, tc, mail, address, phone, birt_date, gender, ad, soyad } = data;

        if (!username || !password || !tc || !mail || !address || !phone || !birt_date || !gender || !ad || !soyad) {
            socket.emit("errorMessage", "❌ Tüm alanları doldurmalısınız!");
            return;
        }

        let existingUser = await User.findOne({ username });

        if (existingUser) {
            socket.emit("errorMessage", "❌ Bu kullanıcı zaten kayıtlı!");
            return;
        }

        const newUser = new User({
            username,
            password,
            role: "user",
            tc,
            mail,
            address,
            phone,
            birt_date,
            gender,
            ad,
            soyad
        });

        await newUser.save();
        console.log(`✅ Yeni kullanıcı eklendi: ${username}`);

        io.emit("participantAdded", { username });

    } catch (error) {
        console.error("❌ Kullanıcı eklenirken hata oluştu:", error);
        socket.emit("errorMessage", "❌ Kullanıcı eklenirken bir hata oluştu!");
    }
});



});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor!`));