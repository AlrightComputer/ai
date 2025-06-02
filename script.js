let OPENAI_API_KEY = '';
let ELEVEN_API_KEY = '';
let ELEVEN_VOICE_ID = '';

document.getElementById('save-btn').addEventListener('click', () => {
  OPENAI_API_KEY = document.getElementById('openai-key').value.trim();
  ELEVEN_API_KEY = document.getElementById('elevenlabs-key').value.trim();
  ELEVEN_VOICE_ID = document.getElementById('voice-id').value.trim();
  alert('🔐 Keys saved. You can now start talking to the assistant.');
});

const circle  = document.getElementById('circle');
const chatlog = document.getElementById('chatlog');

// === 1. Speech recognition setup ===
let recognition;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  circle.addEventListener('click', () => {
    if (!OPENAI_API_KEY || !ELEVEN_API_KEY || !ELEVEN_VOICE_ID) {
      alert("Please enter all API keys and voice ID.");
      return;
    }
    recognition.start();
  });

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    appendToChat(`🗣️ You: ${text}`);
    sendToGPT(text);
  };

  recognition.onerror = (err) => {
    console.error("SpeechRecognition error:", err);
    appendToChat(`⚠️ Speech error: ${err.error}`);
  };
} else {
  console.error("SpeechRecognition not supported in this browser.");
  alert("⚠️ Your browser does not support Speech Recognition. Try Chrome or Edge over HTTPS/localhost.");
}

// === 2. ChatGPT call ===
async function sendToGPT(message) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await res.json();
    const reply = data.choices[0].message.content;

    const needsClaude = /I (can('|’)t|cannot)|unsupported|code|unable/i.test(reply);
    if (needsClaude) {
      appendToChat("🤖 GPT: Delegating to Claude (via Puter.js)...");
      sendToClaude(message);
    } else {
      appendToChat(`🤖 GPT: ${reply}`);
      speakWithElevenLabs(reply);
    }
  } catch (err) {
    appendToChat("⚠️ GPT error: " + err.message);
  }
}

// === 3. Puter.js (Claude Sonnet 4) fallback ===
async function sendToClaude(prompt) {
  try {
    const puterPrompt = `A user asked: "${prompt}". Please help.`;
    const response = await puter.ai.chat(puterPrompt, { model: 'claude-sonnet-4' });
    const reply = response.message.content[0].text;
    appendToChat(`🧠 Claude: ${reply}`);
    speakWithElevenLabs(reply);
  } catch (err) {
    appendToChat("⚠️ Claude (Puter.js) error: " + err.message);
  }
}

// === 4. ElevenLabs text-to-speech ===
async function speakWithElevenLabs(text) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    const blob = await response.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
  } catch (err) {
    appendToChat("🎙️ ElevenLabs error: " + err.message);
  }
}

function appendToChat(text) {
  chatlog.innerText += `\n${text}`;
}
