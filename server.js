const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// इन-मेमोरी डेटाबेस (आप इसे MongoDB से बदल सकते हैं)
const cardsDb = [];
const usersDb = [];

// थीम्स कॉन्फ़िगरेशन
const THEMES = ['lemon', 'peri', 'rose', 'birthday', 'love', 'festival'];

// 1. कार्ड बनाना (Create Card)
app.post('/api/cards', async (req, res) => {
    try {
        const { imageData, message, password, theme, userId } = req.body;
        if (!imageData || !message || !password) {
            return res.status(400).json({ error: 'सभी जानकारी भरना अनिवार्य है।' });
        }

        const id = crypto.randomBytes(4).toString('hex'); // छोटा यूनीक ID
        const hashedPassword = await bcrypt.hash(password, 10);
        const selectedTheme = THEMES.includes(theme) ? theme : 'lemon';

        const newCard = {
            id,
            imageData,
            message,
            passwordHash: hashedPassword,
            theme: selectedTheme,
            userId: userId || null,
            createdAt: new Date()
        };

        cardsDb.push(newCard);
        return res.status(201).json({ id });
    } catch (err) {
        return res.status(500).json({ error: 'सर्वर एरर!' });
    }
});

// 2. कार्ड का बाहरी डेटा पाना (Get Card Metadata for View)
app.get('/api/cards/:id', (req, res) => {
    const card = cardsDb.find(c => c.id === req.params.id);
    if (!card) return res.status(404).json({ error: 'कार्ड नहीं मिला।' });

    return res.json({
        id: card.id,
        imageData: card.imageData,
        theme: card.theme
    });
});

// 3. पासवर्ड जांचना और मैसेज दिखाना (Unlock Card)
app.post('/api/cards/:id/unlock', async (req, res) => {
    try {
        const { password } = req.body;
        const card = cardsDb.find(c => c.id === req.params.id);
        
        if (!card) return res.status(404).json({ error: 'कार्ड नहीं मिला।' });
        const isMatch = await bcrypt.compare(password, card.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'गलत पासवर्ड!' });

        return res.json({ secretMessage: card.message });
    } catch (err) {
        return res.status(500).json({ error: 'वेरिफिकेशन फेल!' });
    }
});

// 4. गूगल ऑथेंटिकेशन सिम्युलेटर (Google Auth)
app.post('/api/auth/google', (req, res) => {
    const { email, name, picture } = req.body;
    if (!email) return res.status(400).json({ error: 'ईमेल जरूरी है।' });

    let user = usersDb.find(u => u.email === email);
    if (!user) {
        user = { id: crypto.randomBytes(6).toString('hex'), email, name, picture };
        usersDb.push(user);
    }
    return res.json(user);
});

// 5. यूजर के बनाए गए पुराने कार्ड्स की गैलरी (User Gallery)
app.get('/api/users/:userId/cards', (req, res) => {
    const userCards = cardsDb.filter(c => c.userId === req.params.userId);
    return res.json(userCards);
});

// स्टेटिक फाइल्स लोड करने के लिए (PWA सपोर्ट)
app.use(express.static(path.join(__dirname, '/')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 सर्वर चालू है पोर्ट: http://localhost:${PORT}`));

