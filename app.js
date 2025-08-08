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
  const chat     = document.getElementById('chat');
  const srStatus = document.getElementById('srStatus');

  if (!startBtn || !stopBtn || !audio || !chat) {
    alert('必要なDOMが足りません（startBtn/stopBtn/audioPlayer/chat）');
    return;
  }

  // ---- recording ----
  let mediaRecorder = null;
  let chunks = [];
  let recording = false;

  // ---- speech recognition (browser dependent) ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const srSupported = !!SR;
  let recog = null;

  if (!srSupported) {
    log('⚠️ Web Speech API (SpeechRecognition) 非対応ブラウザの可能性');
    if (srStatus) srStatus.textContent = '音声認識: 非対応（Chrome推奨 / HTTPS必須）';
  } else {
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;      // 長めに聞き続ける
    recog.interimResults = true;  // 途中結果も受け取る

    // UI反映用：進行中の行
    let currentLine = null;

    recog.onstart = () => {
      log('音声認識 start');
      if (srStatus) srStatus.textContent = '音声認識: 実行中…';
    };

    recog.onresult = (ev) => {
      let interim = '';
      let finalText = '';

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) finalText += text;
        else interim += text;
      }

      // 途中経過の行を作る/更新
      if (interim) {
        if (!currentLine) {
          currentLine = document.createElement('div');
          currentLine.style.opacity = '0.7';
          currentLine.textContent = '🗣️ ' + interim;
          chat.appendChild(currentLine);
          chat.scrollTop = chat.scrollHeight;
        } else {
          currentLine.textContent = '🗣️ ' + interim;
        }
      }

      // 確定したら行を確定表示
      if (finalText) {
        const div = document.createElement('div');
        div.innerHTML = `<strong>User:</strong> ${finalText}`;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;

        if (currentLine) {
          currentLine.remove();
          currentLine = null;
        }
        log('onresult final: ' + finalText);
      }
    };

    recog.onerror = (e) => {
      log('音声認識エラー: ' + e.error);
      if (srStatus) srStatus.textContent = '音声認識: エラー（' + e.error + '）';
    };

    // 録音中なら自動再開（ブラウザが勝手に止めることがあるため）
    recog.onend = () => {
      log('音声認識 end');
      if (srStatus) srStatus.textContent = '音声認識: 待機';
      if (recording) {
        setTimeout(() => {
          try { recog.start(); } catch {}
        }, 250);
      }
    };

    // ユーザー操作内で start する関数
    var startRecognition = () => {
      try {
        recog.start();
      } catch (e) {
        log('recog.start() 失敗: ' + e.message);
      }
    };
  }

  // ---- Record start ----
  startBtn.addEventListener('click', async () => {
    try {
      log('getUserMedia 要求…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('マイク取得 OK');

      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' }); // webm/opus 推奨
        const url = URL.createObjectURL(blob);
        audio.src = url;
        log(`録音停止。サイズ=${blob.size} type=${blob.type}`);
      };

      mediaRecorder.start();
      recording = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      log(`録音開始 state=${mediaRecorder.state}`);

      // ユーザー操作の直後にだけ呼べる制約に合わせる
      if (srSupported && recog) {
        if (srStatus) srStatus.textContent = '音声認識: 起動中…';
        try { recog.start(); } catch (e) { log('recog.start() 失敗: ' + e.message); }
      }
    } catch (err) {
      console.error(err);
      log('マイク取得エラー: ' + err.message);
      alert('マイク取得に失敗。権限/HTTPS/端末設定をご確認ください。');
    }
  });

  // ---- Record stop ----
  stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      recording = false;
      log('stop() 実行');

      // マイク停止
      const tracks = mediaRecorder.stream?.getAudioTracks?.() || [];
      tracks.forEach(t => t.stop());
    }

    if (srSupported && recog) {
      try { recog.stop(); } catch {}
      if (srStatus) srStatus.textContent = '音声認識: 停止';
    }
  });

  // 環境情報
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
});
