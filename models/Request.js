const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["beklemede", "onaylandı"], default: "beklemede" }
});

module.exports = mongoose.model("Request", RequestSchema);