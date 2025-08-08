window.addEventListener('DOMContentLoaded', () => {
  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const log = (m) => {
    const el = $('log');
    const msg = (typeof m === 'string') ? m : JSON.stringify(m);
    console.log(msg);
    if (el) { el.textContent += msg + '\n'; el.scrollTop = el.scrollHeight; }
  };
  const setText = (el, t) => { if (el) el.textContent = t; };

  // ---------- DOM ----------
  const startBtn  = $('startBtn');
  const stopBtn   = $('stopBtn');
  const audio     = $('audioPlayer');
  const chat      = $('chat');
  const partial   = $('partial');   // 途中経過
  const srStatus  = $('srStatus');  // 音声認識の状態

  if (!startBtn || !stopBtn || !audio || !chat) {
    alert('必要なDOMが足りません（startBtn/stopBtn/audioPlayer/chat）');
    return;
  }

  // ---------- state ----------
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  // ちょい足し句読点（簡易）
  const punctuateJa = (s) => {
    if (!s) return s;
    const trimmed = s.trim();
    if (/[!?！？。]$/.test(trimmed)) return trimmed;
    if (/[かなのねでしょうか]$/.test(trimmed)) return trimmed + '？';
    return trimmed + '。';
  };

  // ---------- SpeechRecognition ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;

  if (!SR) {
    log('⚠️ このブラウザは Web Speech API (SpeechRecognition) 非対応の可能性があります。');
  } else {
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;      // 継続認識
    recog.interimResults = true;  // 途中経過オン

    recog.onstart = () => setText(srStatus, '音声認識：開始');

    recog.onresult = (ev) => {
      let interimText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = (res[0] && res[0].transcript) ? res[0].transcript.trim() : '';
        if (!txt) continue;

        if (res.isFinal) {
          const final = punctuateJa(txt);
          const div = document.createElement('div');
          div.innerHTML = `<strong>User:</strong> ${final}`;
          chat.appendChild(div);
          chat.scrollTop = chat.scrollHeight;
          log('final: ' + final);
          setText(partial, ''); // 途中経過クリア
        } else {
          interimText += txt + ' ';
        }
      }
      setText(partial, interimText);
    };

    recog.onerror = (e) => {
      log('音声認識エラー: ' + e.error);
      // 無音などで止まることがあるので録音中は再開を試みる
      if (startBtn.disabled) {
        try { recog.start(); } catch (_) {}
      }
    };

    recog.onend = () => {
      log('音声認識 end');
      if (startBtn.disabled) {
        // 録音中は自動再開（ユーザー操作の継続とみなされやすい）
        try { recog.start(); } catch (_) {}
      } else {
        setText(srStatus, '音声認識：待機');
      }
    };
  }

  // ---------- Recording ----------
  startBtn.onclick = async () => {
    try {
      log('getUserMedia 要求…');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('マイク取得 OK');

      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audio.src = url;
        log(`録音停止。サイズ=${blob.size} type=${blob.type}`);
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log(`録音開始 state=${mediaRecorder.state}`);

      // 音声認識も同時に開始（対応ブラウザのみ）
      if (recog) {
        try { recog.start(); } catch (_) {}
      }
    } catch (err) {
      console.error(err);
      log('マイク取得エラー: ' + err.message);
      alert('マイク取得に失敗しました。ブラウザの権限/HTTPS/端末設定を確認してください。');
    }
  };

  stopBtn.onclick = () => {
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
    } finally {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }

    if (recog) {
      try { recog.stop(); } catch (_) {}
    }

    log('stop() 実行');
  };

  // ---------- env ----------
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') {
    log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
  }
});
