let currentMode = 'upload';
const API_URL = 'https://threed-pic-studio.onrender.com'; // Render ka URL

function selectMode(mode) {
  currentMode = mode;
  document.getElementById('uploadBtn').className = mode === 'upload'? 'btn btn-active' : 'btn btn-inactive';
  document.getElementById('uploadSection').style.display = mode === 'upload'? 'block' : 'none';
  document.getElementById('aiBtn').className = mode === 'ai'? 'btn btn-active' : 'btn btn-inactive';
  document.getElementById('aiSection').style.display = mode === 'ai'? 'block' : 'none';
}

// File upload preview
document.getElementById('fileInput')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if(file) showImage(URL.createObjectURL(file));
});

// AI Image Generate
async function generateAI() {
  const prompt = document.getElementById('aiPrompt').value.trim();
  if(!prompt){ alert('Prompt likho! ex: red car'); return; }
  
  showLoader(true);
  try {
    const response = await fetch(API_URL + '/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({prompt})
    });
    const data = await response.json();
    if(data.error) throw new Error(data.error);
    showImage(data.image);
  } catch(err) {
    alert('Error: ' + err.message + '\n\nRender server so raha ho to 30 sec ruko');
  }
  showLoader(false);
}

// YE WALA NAYA CODE ADD KIYA HAI - Short link banane ke liye
async function generateLink() {
  const message = document.getElementById('secretMsg').value.trim();
  const password = document.getElementById('secretPass').value;
  const imageSrc = document.getElementById('previewImg').src;
  const btn = document.querySelector('.share-btn');

  if(!imageSrc ||!imageSrc.startsWith('data:image')) { 
    alert('Pehle image generate/upload karo'); 
    return; 
  }
  if(!message ||!password) { 
    alert('Message + Password dono bharo'); 
    return; 
  }

  btn.innerText = '⏳ Link ban raha hai...';
  btn.disabled = true;

  try {
    const res = await fetch(API_URL + '/create', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({image: imageSrc, message, password})
    });

    const data = await res.json();
    btn.innerText = '🔗 छोटा शेयर लिंक बनाएं';
    btn.disabled = false;

    if(data.error) {
      alert('Error: ' + data.error);
      return;
