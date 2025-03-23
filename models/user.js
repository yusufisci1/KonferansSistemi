const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Kullanıcı adı
  password: { type: String, required: true }, // Şifre
  role: { type: String, enum: ["admin", "user"], required: true }, // Kullanıcı rolü (admin = başkan, user = normal kullanıcı)
  tc: { type: String, required: true, unique: true }, // TC Kimlik No (Tekil olmalı)
  mail: { type: String, required: true, unique: true }, // E-Posta adresi (Tekil olmalı)
  address: { type: String, required: true }, // Adres
  phone: { type: String, required: true, unique: true }, // Telefon numarası (Tekil olmalı)
  birt_date: { type: Date, required: true }, // Doğum tarihi
  gender: { type: String, enum: ["Erkek", "Kadın"], required: true }, // Cinsiyet
  ad: { type: String, required: true }, // Ad
  soyad: { type: String, required: true } // Soyad
}, { timestamps: true }); // Kullanıcının ne zaman oluşturulduğunu takip etmek için timestamps ekledik

module.exports = mongoose.model("User", userSchema);
