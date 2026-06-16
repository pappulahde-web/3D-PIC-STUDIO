const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// फ्रंटएंड फाइलों को सर्व करने के लिए (index.html इसी फोल्डर में होनी चाहिए)
app.use(express.static(path.join(__dirname, './')));

// 🗄️ MongoDB Connection (आप Render Environment में अपनी Mongo URI डाल सकते हैं या सीधे यहाँ)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://testuser:testpass@cluster.mongodb.net/secretshare?retryWrites=true&w=majority"; 
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully!"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// 📝 Database Schema (डेटा को स्टोर करने का ढांचा)
const CardSchema = new mongoose.Schema({
  imageSrc: String,
  message: String,
  passwordHash: String, // सुरक्षा के लिए पासवर्ड
  createdAt: { type: Date, default: Date.now, expires: 2592000 } // 30 दिन बाद अपने आप डिलीट (Auto Delete)
});
const Card = mongoose.model('Card', CardSchema);

// 🚀 API 1: नया सीक्रेट कार्ड डेटाबेस में सेव करने के लिए
app.post('/api/cards', async (req, res) => {
  try {
    const { imageSrc, message, password } = req.body;
    if(!imageSrc || !message || !password) {
      return res.status(400).json({ error: "सभी फील्ड भरना ज़रूरी है!" });
    }
    
    const newCard = new Card({
      imageSrc: imageSrc,
      message: message,
      passwordHash: password // यहाँ साधारण पासवर्ड रख रहे हैं (फॉर बिगनर्स)
    });

    await newCard.save();
    res.json({ success: true, cardId: newCard._id });
  } catch (error) {
    res.status(500).json({ error: "Server Error: कार्ड सेव नहीं हो पाया।" });
  }
});

// 🔓 API 2: सही पासवर्ड डालने पर कार्ड का डेटा भेजने के लिए
app.post('/api/cards/unlock', async (req, res) => {
  try {
    const { cardId, password } = req.body;
    const card = await Card.findById(cardId);
    
    if(!card) {
      return res.status(404).json({ error: "यह कार्ड मौजूद नहीं है या एक्सपायर हो गया है!" });
    }

    if(card.passwordHash === password) {
      // अगर पासवर्ड सही है, तो फोटो और मैसेज भेज दो
      res.json({ success: true, imageSrc: card.imageSrc, message: card.message });
    } else {
      res.status(401).json({ error: "गलत पासवर्ड! दोबारा कोशिश करें।" });
    }
  } catch (error) {
    res.status(500).json({ error: "सर्वर एरर!" });
  }
});

// 🌐 सिंगल पेज ऐप के लिए राउटिंग (अगर कोई डायरेक्ट लिंक खोलेगा तो index.html लोड होगी)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
