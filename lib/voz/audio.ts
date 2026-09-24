function paraBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

export async function abrirAudio(ctx: AudioContext, aoCapturar: (base64: string) => void) {
  await ctx.audioWorklet.addModule("/pcm-processor.js");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
  const fonte = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, "pcm-processor", { processorOptions: { inputSampleRate: ctx.sampleRate } });
  worklet.port.onmessage = (e) => aoCapturar(paraBase64(e.data));
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  fonte.connect(worklet).connect(mudo).connect(ctx.destination);

  let fim = ctx.currentTime;
  const tocando = new Set<AudioBufferSourceNode>();

  return {
    tocar(base64: string) {
      const bruto = atob(base64);
      const amostras = new Float32Array(bruto.length / 2);
      for (let i = 0; i < amostras.length; i++) {
        const v = bruto.charCodeAt(i * 2) | (bruto.charCodeAt(i * 2 + 1) << 8);
        amostras[i] = (v >= 0x8000 ? v - 0x10000 : v) / 32768;
      }
      const buffer = ctx.createBuffer(1, amostras.length, 24000);
      buffer.getChannelData(0).set(amostras);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      fim = Math.max(fim, ctx.currentTime);
      src.start(fim);
      fim += buffer.duration;
      tocando.add(src);
      src.onended = () => tocando.delete(src);
    },
    silenciar() {
      for (const src of tocando) src.stop();
      tocando.clear();
      fim = ctx.currentTime;
    },
    fechar() {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
