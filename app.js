window.addEventListener('DOMContentLoaded', () => {
  // ここで DOM を安全に取得
  const startBtn = document.getElementById('startBtn') || document.getElementById('record');
  const stopBtn  = document.getElementById('stopBtn')  || document.getElementById('stop');
  const audioPlayer = document.getElementById('audioPlayer') || document.getElementById('player');
  const chat = document.getElementById('chat') || document.getElementById('chat-log');

  // どれが見つからないかを可視化
  if (!startBtn) console.error('startBtn（または record） が見つかりません');
  if (!stopBtn)  console.error('stopBtn（または stop） が見つかりません');
  if (!audioPlayer) console.error('audioPlayer（または player） が見つかりません');
  if (!chat) console.warn('chat（または chat-log）が見つからないので、文字表示はスキップされます');

  // 要素が必須（開始/停止ボタン）なので、なければ何もしない
  if (!startBtn || !stopBtn) return;

  // --- 音声認識セットアップ ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;
  if (recognition) {
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      console.log('onresult:', transcript);
      if (chat && transcript) addMessage('User', transcript);
    };
    recognition.onerror = (e) => console.error('音声認識エラー:', e.error);
  } else {
    console.warn('このブラウザは SpeechRecognition をサポートしていません（Safari/Chrome最新版推奨）');
  }

  // --- 録音セットアップ ---
  let mediaRecorder;
  let audioChunks = [];

  startBtn.onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioPlayer) audioPlayer.src = audioUrl;

        // 録音が終わってから音声認識開始（対応ブラウザのみ）
        if (recognition) {
          try {
            recognition.start();
            console.log('音声認識開始');
          } catch (err) {
            console.warn('recognition.start() 失敗:', err);
          }
        }
      };

      mediaRecorder.start();
      console.log('録音開始');
    } catch (err) {
      console.error('マイク取得エラー:', err);
    }
  };

  stopBtn.onclick = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      console.log('録音停止');
    }
  };

  function addMessage(sender, text) {
    if (!chat) return;
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }
});
