const mongoose = require("mongoose");

// Meetings şeması (Tablo Yapısı)
const MeetingSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Toplantının adı
    date: { type: Date, default: Date.now }, // Toplantı tarihi (Otomatik atanır)
    chairperson_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Başkanın ID'si
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // Katılımcıların ID'leri (Array)
});

// Meetings modelini dışa aktarıyoruz
module.exports = mongoose.model("Meeting", MeetingSchema);
