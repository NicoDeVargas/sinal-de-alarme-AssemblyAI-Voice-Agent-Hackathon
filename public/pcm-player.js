class PCMPlayer extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.passo = 24000 / sampleRate;
    this.atraso = Math.round(sampleRate * options.processorOptions.atraso);
    this.anel = new Float32Array(sampleRate * 60);
    this.limpar();
    this.port.onmessage = (e) => {
      if (e.data === "parar") return this.limpar();
      this.receber(new Int16Array(e.data));
    };
  }
  limpar() {
    this.escrita = 0;
    this.leitura = 0;
    this.disponivel = 0;
    this.pos = 0;
    this.anterior = 0;
    this.tocando = false;
    this.espera = 0;
    this.avisouFalta = false;
  }
  guardar(v) {
    if (this.disponivel === this.anel.length) return;
    this.anel[this.escrita] = v;
    this.escrita = (this.escrita + 1) % this.anel.length;
    this.disponivel++;
  }
  receber(pcm) {
    const n = pcm.length;
    if (!n) return;
    let p = this.pos;
    while (p < n - 1) {
      const i = Math.floor(p);
      const a = i < 0 ? this.anterior : pcm[i] / 32768;
      const b = pcm[i + 1] / 32768;
      this.guardar(a + (b - a) * (p - i));
      p += this.passo;
    }
    this.pos = p - n;
    this.anterior = pcm[n - 1] / 32768;
  }
  process(_, outputs) {
    const saida = outputs[0][0];
    if (!this.tocando && this.disponivel > 0) {
      this.espera += saida.length;
      if (this.disponivel >= this.atraso || this.espera >= this.atraso) {
        this.tocando = true;
        this.avisouFalta = false;
      }
    }
    for (let i = 0; i < saida.length; i++) {
      if (this.tocando && this.disponivel > 0) {
        saida[i] = this.anel[this.leitura];
        this.leitura = (this.leitura + 1) % this.anel.length;
        this.disponivel--;
      } else {
        saida[i] = 0;
        if (this.tocando) {
          this.tocando = false;
          this.espera = 0;
          if (!this.avisouFalta) {
            this.avisouFalta = true;
            this.port.postMessage({ tipo: "falta" });
          }
        }
      }
    }
    return true;
  }
}
registerProcessor("pcm-player", PCMPlayer);
