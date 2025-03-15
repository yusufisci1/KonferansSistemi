const User = require("../models/user");

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ message: "Geçersiz kullanıcı adı veya şifre" });
    
    res.json({ message: "Giriş başarılı", role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
};
