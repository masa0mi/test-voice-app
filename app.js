window.addEventListener('DOMContentLoaded', () => {
  // ---- utilities & DOM ----
  const log = (m) => {
    console.log(m);
    const el = document.getElementById('log');
    if (el) {
      el.textContent += (typeof m === 'string' ? m : JSON.stringify(m)) + '\n';
      el.scrollTop = el.scrollHeight;
    }
  };

  const startBtn = document.getElementById('startBtn');
  const stopBtn  = document.getElementById('stopBtn');
  const audio    = document.getElementById('audioPlayer');
  const chatLog  = document.getElementById('chat');    // ← 確定表示用
  const partialEl= document.getElementById('partial'); // ← 途中経過表示
  const srStatus = document.getElementById('srStatus');

if (!startBtn || !stopBtn || !audio || !chatLog) {
  alert('必要なDOMが足りません（startBtn/stopBtn/audioPlayer/chat）');
  return;
}
};

  // ---- recording ----
  let mediaRecorder = null;
  let chunks = [];
  let recording = false;

  // --- SpeechRecognition（音声認識：リアルタイム表示） ---
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  log('⚠️ このブラウザは Web Speech API (SpeechRecognition) 非対応の可能性があります。');
} else {
  const recog = new SR();
  recog.lang = 'ja-JP';
  recog.continuous = true;       // 継続認識
  recog.interimResults = true;   // 中間結果オン

  const safeSet = (el, txt) => { if (el) el.textContent = txt; };

  // 録音開始で認識も開始（ユーザー操作内でstartする）
  startBtn.addEventListener('click', () => {
    try {
      recog.start();
      log('音声認識 start() 呼び出し');
      safeSet(srStatus, '音声認識：開始');
    } catch (e) {
      log('recog.start() 失敗: ' + e.message);
    }
  });

  // 録音停止で認識も停止
  stopBtn.addEventListener('click', () => {
    try { recog.stop(); } catch(_) {}
  });

  // 途中経過と確定結果を振り分け
  recog.onstart = () => safeSet(srStatus, '音声認識：開始');

  recog.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      const text = (res[0] && res[0].transcript) ? res[0].transcript.trim() : '';
      if (!text) continue;

      if (res.isFinal) {
        // 確定：チャット欄へ
        const div = document.createElement('div');
        div.innerHTML = `<strong>User:</strong> ${text}`;
        if (chatLog) {
          chatLog.appendChild(div);
          chatLog.scrollTop = chatLog.scrollHeight;
        }
        if (partialEl) partialEl.textContent = ''; // 途中表示をクリア
        log('onresult final: ' + text);
      } else {
        // 途中経過：partial に積む
        interim += text + ' ';
      }
    }
    if (partialEl) partialEl.textContent = interim;
  };

  recog.onerror = (e) => {
    log('音声認識エラー: ' + e.error);
    // たまに "no-speech" などで勝手に止まるので、録音中なら再開
    if (startBtn.disabled) {
      try { recog.start(); } catch(_) {}
    }
  };

  recog.onend = () => {
    log('音声認識 end');
    // 録音中なら自動再開（無音で終了したときの対策）
    if (startBtn.disabled) {
      try { recog.start(); } catch(_) {}
    } else {
      safeSet(srStatus, '音声認識：待機');
    }
  };


}
  // 環境情報
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
});
