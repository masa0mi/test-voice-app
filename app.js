const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const audioPlayer = document.getElementById("audioPlayer");
const chat = document.getElementById("chat");

let mediaRecorder;
let audioChunks = [];

// 音声認識 API のクロスブラウザ対応
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "ja-JP";
recognition.continuous = false;
recognition.interimResults = false;

// 音声認識の結果を受け取ったらチャットに表示
recognition.onresult = event => {
  console.log("onresult発火:", event);
  const transcript = event.results[0][0].transcript;
  addMessage("User", transcript);
};

// エラーハンドリング（← 重要！）
recognition.onerror = event => {
  console.error("音声認識エラー:", event.error);
};

recognition.onstart = () => {
  console.log("音声認識開始");
};

recognition.onend = () => {
  console.log("音声認識終了");
};

// 録音開始ボタン
startBtn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;

    // 録音停止後に音声認識を開始
    recognition.start();
  };

  mediaRecorder.start();
  console.log("録音開始");
};

// 録音停止ボタン
stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    console.log("録音停止");
  }
};

// チャットにメッセージを追加
function addMessage(sender, text) {
  const message = document.createElement("div");
  message.className = "message";
  message.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
}
