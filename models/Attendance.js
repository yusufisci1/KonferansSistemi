const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Attendance", AttendanceSchema);