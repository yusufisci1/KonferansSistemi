const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Giriş İşlemi
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).json({ message: "Hatalı kullanıcı adı veya şifre" });
    }

    res.json({ message: "Giriş başarılı", role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

module.exports = router;
