const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static('public'));

const HF_API_KEY = "hf_xxx_xxx"; // apni key daalo
const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1";

// Database: memory me. Production me MongoDB use karna
const db = new Map();

// AES encryption function
function encrypt(text, password) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, password) {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null; // galat password
  }
}

// 1. AI Image Generate
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
    });
    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    res.json({ image: `data:image/png;base64,${base64}` });
  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

// 2. Link Create with encryption
app.post('/create', (req, res) => {
  const { image, message, password } = req.body;
  if(!image || !message || !password) {
    return res.status(400).json({error: "Sab field bharo"});
  }
  
  const id = nanoid(8); // short id: aB3x9K2p
  const encryptedMsg = encrypt(message, password);
  
  db.set(id, { image, encryptedMsg, created: Date.now() });
  
  res.json({ 
    link: `http://localhost:3000/view/${id}`,
    id: id
  });
});

// 3. View page - password check
app.get('/view/:id', (req, res) => {
  const data = db.get(req.params.id);
  if(!data) return res.status(404).send("Link expired ya galat hai");
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Secret Message</title>
      <style>
        body{background:#0f172a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
        .box{background:#1e293b;padding:30px;border-radius:20px;max-width:400px;width:100%}
        input{width:100%;padding:12px;margin:10px 0;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#fff}
        button{width:100%;padding:12px;background:#8b5cf6;border:none;border-radius:10px;color:#fff;font-weight:600;cursor:pointer}
        img{width:100%;border-radius:15px;margin-bottom:15px}
        .msg{margin-top:15px;padding:15px;background:#0f172a;border-radius:10px;white-space:pre-wrap}
      </style>
    </head>
    <body>
      <div class="box">
        <img src="${data.image}" alt="secret">
        <input type="password" id="pass" placeholder="Password daalo">
        <button onclick="unlock()">Unlock करो</button>
        <div id="msgBox"></div>
      </div>
      <script>
        async function unlock(){
          const pass = document.getElementById('pass').value;
          const res = await fetch('/decrypt/${req.params.id}', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({password: pass})
          });
          const data = await res.json();
          if(data.error) {
            alert('Galat password!');
          } else {
            document.getElementById('msgBox').innerHTML = '<div class="msg">'+data.message+'</div>';
            document.getElementById('pass').style.display='none';
            document.querySelector('button').style.display='none';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 4. Decrypt API
app.post('/decrypt/:id', (req, res) => {
  const data = db.get(req.params.id);
  const { password } = req.body;
  const decrypted = decrypt(data.encryptedMsg, password);
  
  if(!decrypted) return res.json({error: "Galat password"});
  res.json({message: decrypted});
});

app.listen(3000, () => console.log("Server: http://localhost:3000"));
