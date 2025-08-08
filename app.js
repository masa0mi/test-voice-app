// app.js ぜんぶ置き換え版（重複宣言なし）
window.addEventListener('DOMContentLoaded', () => {
  // ------ helper & DOM ------
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
    alert('必要なDOMが足りません（startBtn/stopBtn/audioPlayer/chat）');
    return;
  }

  // ------ recorder ------
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  const startRecording = async () => {
    try {
      log('getUserMedia 要求…');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('マイク取得 OK');

      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        audio.src  = url;
        log(`録音停止。サイズ=${blob.size} type=${blob.type}`);
        // マイク解放
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      };

      mediaRecorder.start();
      startBtn.disabled = true;
      stopBtn.disabled  = false;
      log(`録音開始 state=${mediaRecorder.state}`);
    } catch (err) {
      console.error(err);
      log('マイク取得エラー: ' + err.message);
      alert('マイク権限/HTTPS/端末設定を確認してください。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startBtn.disabled = false;
      stopBtn.disabled  = true;
      log('stop() 実行');
    }
  };

  // ------ speech recognition ------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;

  if (!SR) {
    log('⚠️ このブラウザは Web Speech API (SpeechRecognition) 非対応の可能性があります。');
  } else {
    recog = new SR();
    recog.lang = 'ja-JP';
    recog.continuous = true;     // 継続認識
    recog.interimResults = true; // 途中経過

    const safeSet = (el, txt) => { if (el) el.textContent = txt; };

    // 超ざっくり句読点化（デモ用）
    const punctuateJa = (text) => {
      let t = text;
      t = t.replace(/(です|ます|でした|でしたら|だ|だった|である)(よ|ね)?/g, '$1$2。');
      t = t.replace(/(ください|します|しました|しません)/g, '$1。');
      t = t.replace(/(いいですか|どうですか|でしょうか|できますか)/g, '$1？');
      t = t.replace(/\s+/g, ' ').trim();
      // 末尾に句点なければ付ける（？や！除く）
      if (t && !/[。？！]$/.test(t)) t += '。';
      return t;
    };

    // onresult：途中経過は partial、確定は chat に出す
    recog.onresult = (ev) => {
      let interimText = '';
      let finalTexts  = [];

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const raw = (res[0] && res[0].transcript) ? res[0].transcript.trim() : '';
        if (!raw) continue;

        if (res.isFinal) {
          finalTexts.push(punctuateJa(raw));
        } else {
          interimText += raw + ' ';
        }
      }

      // 途中経過を常に表示
      if (partial) partial.textContent = interimText;

      // 確定結果をチャット欄へ
      if (finalTexts.length) {
        finalTexts.forEach(txt => {
          const div = document.createElement('div');
          div.innerHTML = `<strong>User:</strong> ${txt}`;
          chat.appendChild(div);
        });
        chat.scrollTop = chat.scrollHeight;
        if (partial) partial.textContent = '';
      }
    };

    recog.onerror = (e) => {
      log('音声認識エラー: ' + e.error);
      // 無音等で止まった時は、録音中なら自動再開
      if (startBtn.disabled) {
        try { recog.start(); } catch (_) {}
      }
    };

    recog.onstart = () => safeSet(srStatus, '音声認識: 開始');
    recog.onend   = () => {
      log('音声認識 end');
      if (startBtn.disabled) {
        try { recog.start(); } catch (_) {}
      } else {
        safeSet(srStatus, '音声認識: 待機');
      }
    };
  }

  // ------ wire buttons ------
  startBtn.addEventListener('click', async () => {
    await startRecording();
    if (recog) {
      try { recog.start(); } catch (_) {}
    }
  });

  stopBtn.addEventListener('click', () => {
    stopRecording();
    if (recog) {
      try { recog.stop(); } catch (_) {}
    }
  });

  // ------ env ------
  log('UA: ' + navigator.userAgent);
  if (location.protocol !== 'https:') log('⚠️ HTTPSで開いてください（GitHub PagesはOK）');
});
