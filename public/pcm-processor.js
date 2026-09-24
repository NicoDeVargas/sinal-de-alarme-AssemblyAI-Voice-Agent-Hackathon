class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = options.processorOptions.inputSampleRate / 24000;
    this.buffer = new Int16Array(1200);
    this.usado = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const n = Math.floor(input.length / this.ratio);
    for (let i = 0; i < n; i++) {
      const s = input[Math.floor(i * this.ratio)] ?? 0;
      this.buffer[this.usado++] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
      if (this.usado === this.buffer.length) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(1200);
        this.usado = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
