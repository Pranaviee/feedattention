/* BDH checkpoint inspector — trained d=64 / d=128 traces. */

const TRACE_DEBOUNCE_MS = 400;

const state = {
  prompt: "paris",
  model: "bdh_d64",
  layer: 0,
  head: 0,
  selectedTokenIdx: 4,
  hebbianStep: 0,
  traceData: null,
  tracedWord: null,
  temperature: 0.75,
  busy: false,
};

const CHECKPOINTS = {
  bdh_d64: "bdh_d64.pt",
  bdh_d128: "bdh_d128.pt",
};

const promptInput = document.getElementById("prompt-input");
const generateBtn = document.getElementById("generate-btn");
const stepBtn = document.getElementById("step-btn");
const modelSelect = document.getElementById("model-select");
const tempSlider = document.getElementById("temp-slider");
const tempVal = document.getElementById("temp-val");
const traceWordLabel = document.getElementById("trace-word-label");
let traceTimer = null;
const layerTabs = document.getElementById("layer-tabs");
const headSelector = document.getElementById("head-selector");
const viewAttnBtn = document.getElementById("view-attn-matrix");
const viewHebbianBtn = document.getElementById("view-hebbian-loop");
const attnMatrixView = document.getElementById("attn-matrix-view");
const hebbianLoopView = document.getElementById("hebbian-loop-view");
const hebbianSlider = document.getElementById("hebbian-slider");

function setPrompt(next) {
  state.prompt = next;
  promptInput.value = next;
}

function boot() {
  renderStaticMath();
  setupEventListeners();
  fetchTrace();
  watchFrameHeight();
}

function renderStaticMath() {
  if (typeof katex === "undefined") {
    window.addEventListener("load", renderStaticMath, { once: true });
    return;
  }
  document.querySelectorAll(".eq[data-tex]").forEach((el) => {
    const tex = el.getAttribute("data-tex");
    if (!tex) return;
    katex.render(tex, el, { throwOnError: false, displayMode: false });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

function setupEventListeners() {
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(traceTimer);
      state.prompt = promptInput.value;
      fetchTrace();
    }
  });

  promptInput.addEventListener("input", () => {
    state.prompt = promptInput.value;
    scheduleTrace();
  });

  document.querySelectorAll(".preset-chip[data-text]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".preset-chip[data-text]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      clearTimeout(traceTimer);
      setPrompt(chip.getAttribute("data-text") ?? "paris");
      fetchTrace();
    });
  });

  modelSelect.addEventListener("change", (e) => {
    state.model = e.target.value;
    fetchTrace();
  });

  tempSlider.addEventListener("input", (e) => {
    state.temperature = parseFloat(e.target.value);
    tempVal.textContent = state.temperature.toFixed(2);
  });

  generateBtn.addEventListener("click", () => runGenerate(50));

  if (stepBtn) stepBtn.addEventListener("click", stepOneToken);

  const regenRolloutBtn = document.getElementById("regen-rollout-btn");
  if (regenRolloutBtn) regenRolloutBtn.addEventListener("click", () => runGenerate(50));

  layerTabs.querySelectorAll(".layer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      layerTabs.querySelectorAll(".layer-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.layer = parseInt(tab.getAttribute("data-layer"), 10);
      renderCurrentLayer();
    });
  });

  headSelector.querySelectorAll(".head-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      headSelector.querySelectorAll(".head-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.head = parseInt(btn.getAttribute("data-head"), 10);
      renderAttentionHeatmap();
    });
  });

  viewAttnBtn.addEventListener("click", () => {
    viewAttnBtn.classList.add("active");
    viewHebbianBtn.classList.remove("active");
    attnMatrixView.classList.add("active");
    hebbianLoopView.classList.remove("active");
  });

  viewHebbianBtn.addEventListener("click", () => {
    viewHebbianBtn.classList.add("active");
    viewAttnBtn.classList.remove("active");
    hebbianLoopView.classList.add("active");
    attnMatrixView.classList.remove("active");
    renderHebbianMetrics();
  });

  hebbianSlider.addEventListener("input", (e) => {
    state.hebbianStep = parseInt(e.target.value, 10);
    renderHebbianMetrics();
  });
}

function scheduleTrace() {
  clearTimeout(traceTimer);
  traceTimer = setTimeout(() => {
    if (!state.busy) fetchTrace();
  }, TRACE_DEBOUNCE_MS);
}

function notifyParentHeight() {
  if (window.parent === window) return;
  const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  window.parent.postMessage({ type: "livemodel-height", height }, window.location.origin);
}

function watchFrameHeight() {
  if (window.parent === window) return;
  const send = () => notifyParentHeight();
  send();
  window.addEventListener("resize", send);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
  }
}

function setActionsBusy(busy, generateLabel) {
  state.busy = busy;
  if (stepBtn) stepBtn.disabled = busy;
  if (generateBtn) {
    generateBtn.disabled = busy;
    if (generateLabel) generateBtn.textContent = generateLabel;
  }
}

function updateTraceLabel(prompt, tracing) {
  if (!traceWordLabel) return;
  const shown = state.traceData?.sequence_length;
  const total = state.traceData?.prompt_length ?? (prompt ? [...prompt].length : 0);
  const n = shown ?? (prompt ? [...prompt].length : 0);
  const count = total > n ? `${n} of ${total}` : `${n}`;
  traceWordLabel.textContent = tracing ? `Tracing · T = ${count}` : `T = ${count}`;
}

async function fetchTrace({ keepBusy = false } = {}) {
  const prompt = state.prompt || "paris";
  updateTraceLabel(prompt, true);
  setActionsBusy(true, generateBtn?.textContent);
  try {
    const res = await fetch("/api/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: state.model,
        checkpoint: CHECKPOINTS[state.model],
      }),
    });
    const data = await res.json();
    state.traceData = data;
    state.tracedWord = prompt;
    state.selectedTokenIdx = data.sequence_length - 1;
    state.hebbianStep = Math.min(state.hebbianStep, data.sequence_length - 1);

    hebbianSlider.max = data.sequence_length - 1;
    hebbianSlider.value = state.hebbianStep;

    renderAll();
  } catch (err) {
    console.error("Trace error:", err);
  } finally {
    updateTraceLabel(prompt, false);
    if (!keepBusy) setActionsBusy(false, "Generate 50 tokens");
  }
}

async function ensureTrace() {
  const prompt = state.prompt || "paris";
  if (state.traceData && state.tracedWord === prompt) return;
  await fetchTrace();
}

function predToChar(pred) {
  if (!pred) return "";
  if (pred.byte_id === 32) return " ";
  if (pred.byte_id === 10) return "\n";
  return String.fromCharCode(pred.byte_id);
}

async function runGenerate(numTokens = 50) {
  if (state.busy) return;
  clearTimeout(traceTimer);
  const rolloutEl = document.getElementById("rollout-text");
  const seed = promptInput.value || "paris";
  state.prompt = seed;

  await fetchTrace({ keepBusy: true });

  setActionsBusy(true, "Generating…");
  if (rolloutEl) rolloutEl.textContent = "Generating continuation from the checkpoint…";

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: seed,
        max_tokens: numTokens,
        temperature: state.temperature,
        model: state.model,
        checkpoint: CHECKPOINTS[state.model],
      }),
    });
    const data = await res.json();
    const full = typeof data.generated_text === "string" ? data.generated_text : seed;
    setPrompt(full);
    if (rolloutEl) {
      const suffix = full.startsWith(seed) ? full.slice(seed.length) : full;
      rolloutEl.textContent = suffix || full;
    }
    await fetchTrace();
  } catch (err) {
    console.error("Generate error:", err);
    if (rolloutEl) rolloutEl.textContent = "Error during generation: " + err.message;
  } finally {
    setActionsBusy(false, "Generate 50 tokens");
    notifyParentHeight();
  }
}

async function stepOneToken() {
  if (state.busy) return;
  clearTimeout(traceTimer);
  state.prompt = promptInput.value;
  await ensureTrace();
  if (!state.traceData || !state.traceData.predictions.length) return;
  setPrompt(state.prompt + predToChar(state.traceData.predictions[0]));
  await fetchTrace();
}

async function appendPredictedChar(ch) {
  if (state.busy) return;
  clearTimeout(traceTimer);
  state.prompt = promptInput.value;
  setPrompt(state.prompt + ch);
  await fetchTrace();
}

function renderAll() {
  if (!state.traceData) return;
  renderTokenList();
  renderEmbeddingVector();
  renderCurrentLayer();
  renderPredictions();
  notifyParentHeight();
}

function renderTokenList() {
  const container = document.getElementById("tokens-display");
  container.innerHTML = "";

  const shown = state.traceData.chars.length;
  const total = state.traceData.prompt_length ?? shown;
  const indexOffset = Math.max(0, total - shown);

  state.traceData.chars.forEach((char, idx) => {
    const chip = document.createElement("div");
    chip.className = `token-chip-row ${idx === state.selectedTokenIdx ? "selected" : ""}`;
    const byteId = state.traceData.tokens[idx];

    chip.innerHTML = `
      <div class="token-chip-left">
        <span class="token-chip-idx">#${indexOffset + idx}</span>
        <span class="token-chip-char">${char === " " ? "␣" : escapeHtml(char)}</span>
      </div>
      <span class="token-chip-meta">byte ${byteId}</span>
    `;

    chip.addEventListener("click", () => {
      document.querySelectorAll(".token-chip-row").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      state.selectedTokenIdx = idx;
      renderEmbeddingVector();
      renderCurrentLayer();
    });

    container.appendChild(chip);
  });

  const selected = container.querySelector(".token-chip-row.selected");
  if (selected) {
    const listBox = container.getBoundingClientRect();
    const chipBox = selected.getBoundingClientRect();
    if (chipBox.bottom > listBox.bottom) {
      container.scrollTop += chipBox.bottom - listBox.bottom + 8;
    } else if (chipBox.top < listBox.top) {
      container.scrollTop -= listBox.top - chipBox.top + 8;
    }
  }
}

function renderEmbeddingVector() {
  const strip = document.getElementById("embedding-vector-strip");
  strip.innerHTML = "";

  const tokenData = state.traceData.token_embeddings[state.selectedTokenIdx];
  if (!tokenData) return;

  tokenData.vector.slice(0, 8).forEach((val) => {
    const cell = document.createElement("div");
    cell.className = "vector-cell";
    if (val >= 0) {
      const alpha = Math.min(1.0, Math.max(0.18, val / 2.0));
      cell.style.backgroundColor = `rgba(44, 95, 232, ${alpha})`;
    } else {
      const alpha = Math.min(1.0, Math.max(0.18, Math.abs(val) / 2.0));
      cell.style.backgroundColor = `rgba(220, 38, 38, ${alpha})`;
    }
    cell.textContent = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
    strip.appendChild(cell);
  });
}

function renderCurrentLayer() {
  const layerData = state.traceData.layers[state.layer];
  if (!layerData) return;

  document.getElementById("layer-sparsity-badge").textContent = `Sparsity: ${layerData.sparsity_pct}%`;
  document.getElementById("layer-delta-badge").textContent = `Δ norm: ${layerData.delta_norm}`;
  document.getElementById("layer-cossim-badge").textContent = `Cos sim: ${layerData.cosine_similarity}`;

  document.getElementById("active-neurons-count").textContent = Math.round(layerData.active_neurons_avg);
  document.getElementById("silent-neurons-count").textContent =
    state.traceData.config.latent_dim - Math.round(layerData.active_neurons_avg);
  document.getElementById("sparsity-percent").textContent = `${layerData.sparsity_pct}%`;
  const meter = document.getElementById("sparsity-meter-fill");
  if (meter) meter.style.width = `${Math.min(100, parseFloat(layerData.sparsity_pct) || 0)}%`;

  renderNeuronGrid(layerData.head0_sample_neurons);
  renderAttentionHeatmap();
  renderHebbianMetrics();
  renderNeuronVoting(layerData);
}

function renderNeuronGrid(neurons) {
  const grid = document.getElementById("neuron-sample-grid");
  grid.innerHTML = "";

  neurons.forEach((val, idx) => {
    const cell = document.createElement("div");
    cell.className = "neuron-cell";
    if (val === 0) {
      cell.className = "neuron-cell silent";
      cell.style.backgroundColor = "#E3E5E9";
    } else {
      cell.className = "neuron-cell firing";
      const alpha = Math.min(1.0, Math.max(0.35, val / 2.5));
      cell.style.backgroundColor = `rgba(22, 163, 74, ${alpha})`;
    }
    cell.title = `Neuron #${idx}: ${val > 0 ? `Firing (+${val.toFixed(3)})` : "Silent (0.0)"}`;
    grid.appendChild(cell);
  });
}

function renderAttentionHeatmap() {
  const layerData = state.traceData.layers[state.layer];
  if (!layerData) return;

  const headMatrix = layerData.attention_heads[state.head];
  const container = document.getElementById("heatmap-container");
  const chars = state.traceData.chars;
  const T = chars.length;

  let maxScore = 1.0;
  for (let r = 0; r < T; r++) {
    for (let c = 0; c < T; c++) {
      if (headMatrix[r][c] > maxScore) maxScore = headMatrix[r][c];
    }
  }
  document.getElementById("max-score-legend").textContent = `Max (${maxScore.toFixed(1)})`;

  let html = `<table class="attn-matrix-table"><thead><tr><th>Q \\ K</th>`;
  chars.forEach((c) => {
    html += `<th>'${c === " " ? "␣" : escapeHtml(c)}'</th>`;
  });
  html += `</tr></thead><tbody>`;

  for (let r = 0; r < T; r++) {
    html += `<tr><th>'${chars[r] === " " ? "␣" : escapeHtml(chars[r])}'</th>`;
    for (let c = 0; c < T; c++) {
      const score = headMatrix[r][c];
      let bg = "transparent";
      let color = "#8B919C";

      if (score > 0) {
        const ratio = Math.min(1.0, score / maxScore);
        bg = `rgba(44, 95, 232, ${0.12 + 0.88 * ratio})`;
        color = ratio > 0.42 ? "#ffffff" : "#1E4FC4";
      }

      html += `<td class="attn-cell" style="background-color: ${bg}; color: ${color};" title="Token '${escapeHtml(chars[r])}' attends to past '${escapeHtml(chars[c])}': score ${score}">${score.toFixed(1)}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderHebbianMetrics() {
  const layerData = state.traceData.layers[state.layer];
  if (!layerData) return;

  const step = Math.min(state.hebbianStep, layerData.hebbian_steps.length - 1);
  const info = layerData.hebbian_steps[step];
  if (!info) return;

  const charDisplay = info.char === " " ? "␣" : info.char;
  document.getElementById("hebbian-step-label").textContent = `t = ${step}  ('${charDisplay}')`;

  const container = document.getElementById("hebbian-metrics");
  container.innerHTML = `
    <div class="metric-box featured">
      <span class="m-val">${info.rho_norm}</span>
      <span class="m-lbl">||ρ<sub>t</sub>||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.read_norm}</span>
      <span class="m-lbl">||q<sub>t</sub>ᵀ ρ<sub>t</sub>||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.k_norm}</span>
      <span class="m-lbl">||k||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.v_norm}</span>
      <span class="m-lbl">||v||</span>
    </div>
  `;
}

function renderNeuronVoting(layerData) {
  const selectedChar = state.traceData.chars[state.selectedTokenIdx];
  document.getElementById("token-pos-label").textContent = `'${selectedChar === " " ? "␣" : selectedChar}'`;
  document.getElementById("active-voting-count").textContent = layerData.active_neuron_count_last;

  const container = document.getElementById("neuron-voting-list");
  container.innerHTML = "";

  const maxContrib =
    layerData.neuron_contributions_top.length > 0 ? layerData.neuron_contributions_top[0].contribution : 1.0;

  layerData.neuron_contributions_top.forEach((n) => {
    const row = document.createElement("div");
    row.className = "voting-row";
    const pctBar = Math.min(100, Math.round((n.contribution / maxContrib) * 100));
    row.innerHTML = `
      <span class="neuron-id-tag">#${n.neuron_id} · H${n.head}</span>
      <div class="neuron-contrib-bar-container" title="Contribution ||a_i w_i||: ${n.contribution}">
        <div class="neuron-contrib-bar" style="width: ${pctBar}%"></div>
      </div>
      <span class="neuron-act-val">a<sub>i</sub> ${n.activation.toFixed(2)}</span>
    `;
    row.title = `Neuron #${n.neuron_id} direction: [${n.vector_sample.join(", ")}, …]`;
    container.appendChild(row);
  });
}

function renderPredictions() {
  const container = document.getElementById("predictions-list");
  container.innerHTML = "";

  state.traceData.predictions.forEach((pred) => {
    const row = document.createElement("div");
    row.className = "pred-row";
    row.innerHTML = `
      <span class="pred-char">${escapeHtml(pred.char)}</span>
      <div class="pred-bar-container">
        <div class="pred-bar-fill" style="width: ${Math.min(100, pred.prob_percent)}%"></div>
      </div>
      <span class="pred-pct">${pred.prob_percent.toFixed(1)}%</span>
    `;

    row.addEventListener("click", () => {
      appendPredictedChar(predToChar(pred));
    });

    container.appendChild(row);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
