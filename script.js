let recognizer, modelReady = false;
const transcriptEl = document.getElementById("transcript");
const responseEl = document.getElementById("response");

const openaiInput = document.getElementById("openaiKey");
const elevenLabsInput = document.getElementById("elevenLabsKey");
const voiceIdInput = document.getElementById("voiceId");

async function initRecognizer() {
  const model = await Vosk.createModel("https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip");
  recognizer = new model.KaldiRecognizer();
  modelReady = true;
  console.log("Vosk ready");
}

async function startListening() {
  if (!modelReady) {
    console.error("Model not ready");
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    recognizer.acceptWaveform(e.inputBuffer);
  };

  recognizer.on("result", (msg) => {
    const text = msg.result.text;
    transcriptEl.textContent = text;
    fetchResponse(text);
  });

  source.connect(processor);
  processor.connect(audioCtx.destination);
}

async function fetchResponse(text) {
  const openaiKey = openaiInput.value;
  const elevenKey = elevenLabsInput.value;
  const voiceId = voiceIdInput.value;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: text }]
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;
  responseEl.textContent = reply;

  const voiceRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": elevenKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: reply,
      voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    })
  });

  const audioBlob = await voiceRes.blob();
  const audioURL = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioURL);
  audio.play();
}

document.getElementById("listenBtn").onclick = () => startListening();
initRecognizer();
