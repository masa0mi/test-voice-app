window.addEventListener('DOMContentLoaded', () => {
  const log = (m) => {
    console.log(m);
    const el = document.getElementById('log');
    if (el) { el.textContent += (typeof m === 'string' ? m : JSON.stringify(m)) + '\n'; el.scrollTop = el.scrollHeight; }
  };

  const startBtn = document.getElementById('startBtn');
  const stopBtn  = document.getElementById('stopBtn');
  const audio    = document.getElementById('audioPlayer');
  const chat     = document.getElementById('chat');

  if (!startBtn || !stopBtn || !audio) {
    alert('必要なDOMが見つかりません（startBtn/stopBtn/audioPlayer）');
    return;
  }

  let mediaRecorder = null;
  let chunks = [];

  // --- MediaRecorder（録音） ---
  startBtn.addEventListener('click', async () => {
    try {
      log('getUserMedia 要求…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('マイク取得 OK');

      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' }); // Safariはwav弱いのでwebm/opus優先
        const url = URL.createObjectURL(blob);
        audio.src = url;
        log(`録音停止。サイズ=${blob.size} type=${blob.type}`);
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log(`録音開始 state=${mediaRecorder.state}`);
    } catch (err) {
      console.error(err);
      log('マイク取得エラー: ' + err.message);
      alert('マイク取得に失敗しました。ブラウザの権限/HTTPS/端末設定を確認してください。');
    }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      log('stop() 実行');
    }
  });

  // --- SpeechRecognition（音声認識） ※対応ブラウザ限定 ---
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    log('⚠️ このブラウザは Web Speech API (SpeechRecognition) 非対応の可能性があります。');
  } else {
    const recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = false;
    recog.interimResults = false;

    // 録音停止後に認識を開始（ユーザー操作後なら許可されやすい）
    const startRecognition = () => {
      try {
        recog.start();
        log('音声認識 start() 呼び出し');
      } catch (e) {
        log('recog.start() 失敗: ' + e.message);
      }
    };

    // MediaRecorder停止のたびに認識開始
    const origOnStop = (mediaRecorder && mediaRecorder.onstop) || null;
    const hookStop = () => {
      if (mediaRecorder) {
        const prev = mediaRecorder.onstop;
        mediaRecorder.onstop = (...args) => {
          if (prev) prev.apply(mediaRecorder, args);
          startRecognition();
        };
      }
    };
    // 録音開始時にフックを仕込む
    startBtn.addEventListener('click', hookStop);

    recog.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      log('onresult: ' + transcript);
      if (chat && transcript) {
        const div = document.createElement('div');
        div.innerHTML = `<strong>User:</strong> ${transcript}`;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
      }
    };
    recog.onerror = (e) => log('音声認識エラー: ' + e.error);
    recog.onend = () => log('音声認識 end');
  }

  // 環境情報
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
});
