const mongoose = require("mongoose");

const VoteUserSchema = new mongoose.Schema({
    vote_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vote", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    selected_option: { type: String, required: true }
});

module.exports = mongoose.model("VoteUser", VoteUserSchema);