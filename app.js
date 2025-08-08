// app.js ーー 全文置き換え
window.addEventListener('DOMContentLoaded', () => {
  // ---- utils & DOM ----
  const $ = (id) => document.getElementById(id);
  const log = (m) => {
    console.log(m);
    const el = $('log');
    if (el) {
      el.textContent += (typeof m === 'string' ? m : JSON.stringify(m)) + '\n';
      el.scrollTop = el.scrollHeight;
    }
  };

  const startBtn  = $('startBtn');
  const stopBtn   = $('stopBtn');
  const audio     = $('audioPlayer');
  const chat      = $('chat');      // 確定結果の表示先（※ id は1つだけ）
  const partial   = $('partial');   // 途中経過の表示先（任意）
  const srStatus  = $('srStatus');  // 認識状態表示（任意）

  if (!startBtn || !stopBtn || !audio || !chat) {
    alert('必要なDOMが足りません（startBtn / stopBtn / audioPlayer / chat）');
    return;
  }

    const srStatus = document.getElementById('srStatus');

  if (!startBtn || !stopBtn || !audio || !chatLog) {
    alert('必要なDOMが足りません（startBtn/stopBtn/audioPlayer/chat）');
    return;
  }

  // --- 日本語用 簡易句読点・疑問符自動付加 ---
  function jpAutoPunct(s) {
    const t = s.trim();
    if (!t) return t;

    if (/[。．？！!?…]$/.test(t)) return t;

    const qEnds = ['か', 'かい', 'かな', 'かね', 'かしら', 'でしょうか', 'ますか', 'ですか', 'でしょ？'];
    if (qEnds.some(end => t.endsWith(end))) return t + '？';

    if (/(ない|なかった|じゃない)$/.test(t)) return t + '？';

    return t + '。';
  }

  // ---- recording ----
  let mediaRecorder = null;
  
  // ---- recording state ----
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  // ---- SpeechRecognition ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;

  if (!SR) {
    log('⚠️ このブラウザは Web Speech API (SpeechRecognition) 非対応の可能性があります。');
  } else {
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;     // 継続認識
    recog.interimResults = true; // 途中経過ON

    const safeSet = (el, txt) => { if (el) el.textContent = txt; };

    recog.onstart = () => safeSet(srStatus, '音声認識：開始');

    // 途中経過と確定結果を振り分け
    recog.onresult = (ev) => {
    let finalTexts = [];
    let interimText = '';

    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      const txt = res[0]?.transcript?.trim() || '';
    if (!txt) continue;

    if (res.isFinal) {
      const punctuated = jpAutoPunct(txt); // ← 句読点処理
      finalTexts.push(punctuated);
    } else {
      interimText += txt + ' ';
    }
  }

  // 途中経過を常に表示
  if (partialEl) partialEl.textContent = interimText;

  // 確定はチャット欄へ。積んだら途中経過はクリア
  if (finalTexts.length && chatLog) {
    finalTexts.forEach(t => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>User:</strong> ${t}`;
      chatLog.appendChild(div);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
    if (partialEl) partialEl.textContent = '';
  }
};
    recog.onerror = (e) => {
      log('音声認識エラー: ' + e.error);
      // 無音で切れたとき等は録音中なら自動再開
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try { recog.start(); } catch (_) {}
      }
    };

    recog.onend = () => {
      log('音声認識 end');
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try { recog.start(); } catch (_) {}
      } else {
        safeSet(srStatus, '音声認識：待機');
      }
    };
  }

  // ---- MediaRecorder (録音) ----
  startBtn.addEventListener('click', async () => {
    try {
      log('getUserMedia 要求…');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('マイク取得 OK');

      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' }); // Safari対策は必要なら別途
        const url  = URL.createObjectURL(blob);
        audio.src  = url;
        log(`録音停止。サイズ=${blob.size} type=${blob.type}`);
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled  = false;
      log(`録音開始 state=${mediaRecorder.state}`);

      // 録音と同時に認識も開始（対応ブラウザのみ）
      if (recog) {
        try { recog.start(); } catch (_) {}
      }
    } catch (err) {
      console.error(err);
      log('マイク取得エラー: ' + err.message);
      alert('マイク権限/HTTPS/端末設定を確認してください。');
    }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled  = true;
    log('stop() 実行');

    if (recog) {
      try { recog.stop(); } catch (_) {}
    }
  });

  // ---- env info ----
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
});
