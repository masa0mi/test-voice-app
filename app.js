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
