import { diagnostico, notificar, registrarErro } from "./diagnostico";

const ATRASO_MS = 150;

function paraBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

function deBase64(base64: string) {
  const bruto = atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes.buffer;
}

export async function abrirAudio(ctx: AudioContext, aoCapturar: (base64: string, bytes: number) => void) {
  await Promise.all([ctx.audioWorklet.addModule("/pcm-processor.js"), ctx.audioWorklet.addModule("/pcm-player.js")]);
  diagnostico.ctxEstado = ctx.state;
  diagnostico.ctxTaxa = ctx.sampleRate;
  ctx.addEventListener("statechange", () => {
    diagnostico.ctxEstado = ctx.state;
    notificar();
  });
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
  } catch (e) {
    diagnostico.micPermitido = false;
    registrarErro(`getUserMedia: ${(e as Error).name}`);
    throw e;
  }
  diagnostico.micPermitido = true;
  const trilha = stream.getAudioTracks()[0];
  if (trilha) {
    diagnostico.micTrilha = `${trilha.label} ${trilha.readyState} muted=${trilha.muted}`;
    trilha.addEventListener("ended", () => {
      diagnostico.micTrilha = `${trilha.label} ${trilha.readyState} muted=${trilha.muted}`;
      notificar();
    });
    trilha.addEventListener("mute", () => {
      diagnostico.micTrilha = `${trilha.label} ${trilha.readyState} muted=${trilha.muted}`;
      notificar();
    });
    trilha.addEventListener("unmute", () => {
      diagnostico.micTrilha = `${trilha.label} ${trilha.readyState} muted=${trilha.muted}`;
      notificar();
    });
  }
  notificar();
  const fonte = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, "pcm-processor", { processorOptions: { inputSampleRate: ctx.sampleRate } });
  worklet.port.onmessage = (e) => {
    const amostras = new Int16Array(e.data);
    let soma = 0;
    for (let i = 0; i < amostras.length; i++) {
      const v = amostras[i] / 32768;
      soma += v * v;
    }
    diagnostico.micNivel = amostras.length ? Math.sqrt(soma / amostras.length) : 0;
    notificar();
    aoCapturar(paraBase64(e.data), amostras.byteLength);
  };
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  fonte.connect(worklet).connect(mudo).connect(ctx.destination);

  const tocador = new AudioWorkletNode(ctx, "pcm-player", {
    numberOfInputs: 0,
    outputChannelCount: [1],
    processorOptions: { atraso: ATRASO_MS / 1000 },
  });
  tocador.port.onmessage = (e) => {
    if (e.data?.tipo === "falta") {
      diagnostico.faltasDeAudio++;
      notificar();
    }
  };
  tocador.connect(ctx.destination);

  let fim = 0;
  function proximoInicio() {
    const agora = performance.now();
    return fim > agora ? fim : agora + ATRASO_MS;
  }

  return {
    proximoInicio,
    tocar(base64: string) {
      const buffer = deBase64(base64);
      fim = proximoInicio() + buffer.byteLength / 48;
      diagnostico.audioRecebidoMs += buffer.byteLength / 48;
      notificar();
      tocador.port.postMessage(buffer, [buffer]);
    },
    silenciar() {
      fim = 0;
      tocador.port.postMessage("parar");
    },
    fechar() {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
