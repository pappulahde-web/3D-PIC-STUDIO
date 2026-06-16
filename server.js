const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static('public')); // HTML file yaha rakho

const HF_API_KEY = "hf_xxx_xxx"; // yaha apni HuggingFace API key daalo
const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1";

app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if(!prompt) return res.status(400).json({error: "Prompt chahiye"});

    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        inputs: prompt,
        options: { wait_for_model: true }
      })
    });

    if(!response.ok) {
      return res.status(500).json({error: "AI model busy hai, 10 sec baad try karo"});
    }

    const buffer = await response.buffer();
    const base64 = buffer.toString('base64');
    res.json({ image: `data:image/png;base64,${base64}` });

  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

app.listen(3000, () => console.log("Server chal raha: http://localhost:3000"));
