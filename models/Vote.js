const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
    meeting_id: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    status: { type: String, enum: ["açık", "kapalı"], default: "açık" }
});

module.exports = mongoose.model("Vote", VoteSchema);