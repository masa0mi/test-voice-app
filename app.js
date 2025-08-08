let audioContext;
let recorder;
let stream;

const recordButton = document.getElementById("record");
const stopButton = document.getElementById("stop");
const statusText = document.getElementById("status");
const player = document.getElementById("player");
const level = document.getElementById("level-indicator");

recordButton.onclick = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const input = audioContext.createMediaStreamSource(stream);
  recorder = new Recorder(input, { numChannels: 1 });

  recorder.record();
  statusText.textContent = "🔴 録音中...";
  recordButton.disabled = true;
  stopButton.disabled = false;

  // 簡易レベル表示（音の強さを判定）
  const analyser = audioContext.createAnalyser();
  input.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const updateLevel = () => {
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
    level.textContent = volume > 30 ? "📢" : "🔈";
    if (recorder) requestAnimationFrame(updateLevel);
  };
  updateLevel();
};

stopButton.onclick = () => {
  recorder.stop();
  stream.getAudioTracks()[0].stop();
  statusText.textContent = "🛑 録音停止";
  recordButton.disabled = false;
  stopButton.disabled = true;

  recorder.exportWAV(blob => {
    const url = URL.createObjectURL(blob);
    player.src = url;
  });
  
  recorder.clear();
  recorder = null;
};

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';
recognition.interimResults = true;
recognition.continuous = false;

const chatLog = document.getElementById('chat-log');

// ====== 音声認識（SpeechRecognition） ======
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  console.warn("このブラウザは SpeechRecognition をサポートしていません。Chrome を使ってください。");
}

const recognition = SR ? new SR() : null;
if (recognition) {
  recognition.lang = 'ja-JP';
  recognition.interimResults = true;
  recognition.continuous = true; // 録音中は継続して拾う

  const chatLog = document.getElementById('chat-log');

  // 進行中テキストを同じ要素で更新する用
  let currentLine = null;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    // 中間結果は1行で更新、確定したら固定行に
    const isFinal = event.results[event.results.length - 1].isFinal;

    if (!currentLine) {
      currentLine = document.createElement('div');
      chatLog.appendChild(currentLine);
    }
    currentLine.textContent = (isFinal ? "🗣️ " : "… ") + transcript;
    chatLog.scrollTop = chatLog.scrollHeight;

    if (isFinal) {
      // 確定したら行を確定して、新しい行用にリセット
      currentLine = null;
    }
  };

  recognition.onerror = (event) => {
    console.error("音声認識エラー:", event.error);
  };

  recognition.onend = () => {
    // 録音中は自動で再開（たまに切れる対策）
    if (!stopButton.disabled) {
      try { recognition.start(); } catch {}
    }
  };
}

// 録音ボタンで認識も開始
recordButton.addEventListener("click", () => {
  if (recognition) {
    try { recognition.start(); } catch {}
    console.log("音声認識開始");
  }
});

// 停止ボタンで認識も停止
stopButton.addEventListener("click", () => {
  if (recognition) {
    try { recognition.stop(); } catch {}
    console.log("音声認識停止");
  }
});
