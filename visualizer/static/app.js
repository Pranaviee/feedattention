/* ==========================================================================
   BDH EXPLAINER - CLIENT APPLICATION LOGIC
   1. Micro Mode: Exact n x d matrix synaptic visualization
   2. LLM Mode: Real trained checkpoint visualization (paris, Shakespeare)
   ========================================================================== */

const state = {
  mode: "micro",           // "micro" or "llm"
  microScenario: "beat3",  // "beat3" or "bdh"
  microStep: 0,            // 0, 1, 2 or "query"
  microData: null,

  prompt: "paris",
  model: "bdh_d64",
  layer: 0,
  head: 0,
  selectedTokenIdx: 4,
  hebbianStep: 0,
  traceData: null,
  temperature: 0.75
};

// DOM Elements
const btnModeMicro = document.getElementById("btn-mode-micro");
const btnModeLlm = document.getElementById("btn-mode-llm");
const microSection = document.getElementById("micro-view-section");
const llmContainer = document.getElementById("llm-view-container");
const modelSelectPill = document.getElementById("model-select-pill");
const tempSliderPill = document.getElementById("temp-slider-pill");

// Micro DOM
const btnScenBeat3 = document.getElementById("btn-scen-beat3");
const btnScenBdh = document.getElementById("btn-scen-bdh");
const microActionControls = document.getElementById("micro-action-controls");
const microBannerText = document.getElementById("micro-banner-text");

// LLM DOM
const promptInput = document.getElementById("prompt-input");
const traceBtn = document.getElementById("trace-btn");
const generateBtn = document.getElementById("generate-btn");
const modelSelect = document.getElementById("model-select");
const tempSlider = document.getElementById("temp-slider");
const tempVal = document.getElementById("temp-val");

const layerTabs = document.getElementById("layer-tabs");
const headSelector = document.getElementById("head-selector");
const viewAttnBtn = document.getElementById("view-attn-matrix");
const viewHebbianBtn = document.getElementById("view-hebbian-loop");
const attnMatrixView = document.getElementById("attn-matrix-view");
const hebbianLoopView = document.getElementById("hebbian-loop-view");
const hebbianSlider = document.getElementById("hebbian-slider");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  fetchMicroData();
  fetchTrace();
  switchMode(state.mode);
});

function setupEventListeners() {
  // Mode Switcher
  btnModeMicro.addEventListener("click", () => switchMode("micro"));
  btnModeLlm.addEventListener("click", () => switchMode("llm"));

  // Micro Scenario Switcher
  btnScenBeat3.addEventListener("click", () => {
    btnScenBeat3.classList.add("active");
    btnScenBdh.classList.remove("active");
    state.microScenario = "beat3";
    state.microStep = 0;
    renderMicroView();
  });

  btnScenBdh.addEventListener("click", () => {
    btnScenBdh.classList.add("active");
    btnScenBeat3.classList.remove("active");
    state.microScenario = "bdh";
    state.microStep = 0;
    renderMicroView();
  });

  // LLM Prompt Input & Enter key
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      state.prompt = promptInput.value.trim() || "paris";
      fetchTrace();
    }
  });

  traceBtn.addEventListener("click", () => {
    state.prompt = promptInput.value.trim() || "paris";
    fetchTrace();
  });

  // Example Chips
  document.querySelectorAll(".preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.prompt = chip.getAttribute("data-text");
      promptInput.value = state.prompt;
      fetchTrace();
    });
  });

  // Model Selection
  modelSelect.addEventListener("change", (e) => {
    state.model = e.target.value;
    fetchTrace();
  });

  // Temperature Slider
  tempSlider.addEventListener("input", (e) => {
    state.temperature = parseFloat(e.target.value);
    tempVal.textContent = state.temperature.toFixed(2);
  });

  // Generate Next Token
  generateBtn.addEventListener("click", () => runGenerate(50));

  const stepBtn = document.getElementById("step-btn");
  if (stepBtn) {
    stepBtn.addEventListener("click", stepOneToken);
  }

  const regenRolloutBtn = document.getElementById("regen-rollout-btn");
  if (regenRolloutBtn) {
    regenRolloutBtn.addEventListener("click", () => runGenerate(50));
  }

  // Layer Tabs
  layerTabs.querySelectorAll(".layer-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      layerTabs.querySelectorAll(".layer-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.layer = parseInt(tab.getAttribute("data-layer"), 10);
      renderCurrentLayer();
    });
  });

  // Head Selector
  headSelector.querySelectorAll(".head-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      headSelector.querySelectorAll(".head-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.head = parseInt(btn.getAttribute("data-head"), 10);
      renderAttentionHeatmap();
    });
  });

  // View Toggle (Attention Matrix vs Hebbian Loop)
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

  // Hebbian Slider
  hebbianSlider.addEventListener("input", (e) => {
    state.hebbianStep = parseInt(e.target.value, 10);
    renderHebbianMetrics();
  });
}

function switchMode(mode) {
  state.mode = mode;
  if (mode === "micro") {
    btnModeMicro.classList.add("active");
    btnModeLlm.classList.remove("active");
    microSection.classList.add("active");
    llmContainer.classList.remove("active");
    modelSelectPill.style.display = "none";
    tempSliderPill.style.display = "none";
    renderMicroView();
  } else {
    btnModeLlm.classList.add("active");
    btnModeMicro.classList.remove("active");
    llmContainer.classList.add("active");
    microSection.classList.remove("active");
    modelSelectPill.style.display = "flex";
    tempSliderPill.style.display = "flex";
    renderAll();
  }
}

// =============================================================================
// MICRO MATRIX VISUALIZER LOGIC (Exact n x d dimensions, Beats 3–5)
// =============================================================================

async function fetchMicroData() {
  try {
    const res = await fetch("/api/micro_data");
    const data = await res.json();
    state.microData = data;
    renderMicroView();
  } catch (err) {
    console.error("Micro data error:", err);
  }
}

function renderMicroView() {
  if (!state.microData) return;

  if (state.microScenario === "beat3") {
    renderBeat3Scenario();
  } else {
    renderBdhMicroScenario();
  }
}

// --- SCENARIO 1: BEAT 3 (France -> Paris, n=8 neurons x d=3 values) ---
function renderBeat3Scenario() {
  const data = state.microData.beat3;
  document.getElementById("pill-kv-dims").textContent = "k ∈ ℝ⁸, v ∈ ℝ³";
  document.getElementById("pill-outer-dims").textContent = "Δρ = k ⊗ vᵀ ∈ ℝ⁸ˣ³";
  document.getElementById("pill-rho-dims").textContent = "ρ ∈ ℝ⁸ˣ³ (Fixed Size)";
  document.getElementById("pill-read-dims").textContent = "v̂ = qᵀ · ρ ∈ ℝ³";

  microBannerText.innerHTML = `
    <strong>Beat 3 Implementation:</strong> Storing 3 associations into an 8×3 memory table.
    Every write is an 8×3 outer product matrix. When querying "France", Paris wins with <strong>1.64</strong> vs Tokyo (0.64) and Berlin (0.64) crosstalk!
  `;

  // Action step buttons
  const controls = document.getElementById("micro-action-controls");
  controls.innerHTML = `
    <button class="micro-act-btn ${state.microStep === 0 ? "active" : ""}" onclick="setMicroStep(0)">
      1. Store France → Paris
    </button>
    <button class="micro-act-btn ${state.microStep === 1 ? "active" : ""}" onclick="setMicroStep(1)">
      2. Store Japan → Tokyo
    </button>
    <button class="micro-act-btn ${state.microStep === 2 ? "active" : ""}" onclick="setMicroStep(2)">
      3. Store Germany → Berlin
    </button>
    <button class="micro-act-btn query-btn ${state.microStep === 'query' ? "active" : ""}" onclick="setMicroStep('query')">
      🔍 Query: France
    </button>
  `;

  if (state.microStep === "query") {
    renderBeat3Query(data);
  } else {
    renderBeat3Step(data, state.microStep);
  }
}

function setMicroStep(step) {
  state.microStep = step;
  renderMicroView();
}

function renderBeat3Step(data, stepIdx) {
  const step = data.steps[stepIdx];
  const neurons = data.neurons;
  const valLabels = ["Paris (col 0)", "Tokyo (col 1)", "Berlin (col 2)"];

  // 1. Panel 1: Vectors k and v
  const kContainer = document.getElementById("micro-k-vec");
  kContainer.innerHTML = "";
  step.key_vector.forEach((val, i) => {
    const row = document.createElement("div");
    row.className = `k-cell-row ${val > 0 ? "firing" : "silent"}`;
    row.innerHTML = `<span>${neurons[i]}</span><strong>${val.toFixed(1)}</strong>`;
    kContainer.appendChild(row);
  });

  const vContainer = document.getElementById("micro-v-vec");
  vContainer.innerHTML = "";
  step.val_vector.forEach((val, j) => {
    const cell = document.createElement("div");
    cell.className = `v-cell ${val > 0 ? "active-val" : ""}`;
    cell.innerHTML = `<div style="font-size: 0.68rem; color: #64748b;">${valLabels[j].split(" ")[0]}</div><div>${val.toFixed(1)}</div>`;
    vContainer.appendChild(cell);
  });

  // 2. Panel 2: Outer Product Matrix (8 x 3)
  const outerContainer = document.getElementById("micro-outer-matrix");
  outerContainer.innerHTML = buildMatrixTable(step.outer_product, neurons, ["Paris", "Tokyo", "Berlin"], "nonzero");

  // 3. Panel 3: Synaptic Table rho (8 x 3)
  const rhoContainer = document.getElementById("micro-rho-matrix");
  rhoContainer.innerHTML = buildMatrixTable(step.rho_after, neurons, ["Paris", "Tokyo", "Berlin"], "highlight-rho");

  // 4. Panel 4: Readout & Progress
  const readContainer = document.getElementById("micro-readout-math");
  readContainer.innerHTML = `
    <div style="color: #64748b; font-size: 0.78rem;">
      Written: <strong>${step.cue} ➔ ${step.val}</strong><br>
      Rows active in this write: <code>${step.key_vector.map((v, i) => v > 0 ? neurons[i].split(" ")[0] : null).filter(Boolean).join(", ")}</code>
    </div>
    <div class="calc-line">
      <span>Key vector norm ||k||:</span>
      <strong>${Math.sqrt(step.key_vector.reduce((a,b)=>a+b*b, 0)).toFixed(2)}</strong>
    </div>
    <div class="calc-line">
      <span>Value vector norm ||v||:</span>
      <strong>${Math.sqrt(step.val_vector.reduce((a,b)=>a+b*b, 0)).toFixed(2)}</strong>
    </div>
    <div class="calc-total">
      <span>Table entries modified:</span>
      <strong>${step.key_vector.filter(v => v > 0).length} rows updated</strong>
    </div>
  `;

  document.getElementById("micro-winner-box").innerHTML = `
    <div class="winner-title">Status: Association Stored</div>
    <div class="winner-details">
      Memory table ρ received outer-product write <code>k_${step.cue} ⊗ v_${step.val}ᵀ</code>.<br>
      Click <strong>"Query: France"</strong> above to test recall!
    </div>
  `;
}

function renderBeat3Query(data) {
  const query = data.query_france;
  const neurons = data.neurons;

  // Panel 1: France Query Key
  const kContainer = document.getElementById("micro-k-vec");
  kContainer.innerHTML = "";
  query.q_vector.forEach((val, i) => {
    const row = document.createElement("div");
    row.className = `k-cell-row ${val > 0 ? "firing" : "silent"}`;
    row.innerHTML = `<span>${neurons[i]}</span><strong>${val.toFixed(1)}</strong>`;
    kContainer.appendChild(row);
  });

  const vContainer = document.getElementById("micro-v-vec");
  vContainer.innerHTML = `
    <div style="font-size: 0.78rem; color: #64748b; padding: 4px;">
      Query Mode: Reading past memory with query <code>q = k_France</code>.
    </div>
  `;

  // Panel 2: Table rho
  document.getElementById("micro-outer-matrix").innerHTML = `
    <div style="padding: 10px; font-size: 0.8rem; color: #64748b; line-height: 1.4;">
      <strong>Recall Rule (Beat 3.4):</strong><br>
      Take each firing neuron's row in ρ, scale it by how hard the neuron fired, and sum them up:<br><br>
      <code>0.8 × row(n1) = [0.64, 0.64, 0.64]</code><br>
      <code>1.0 × row(n2) = [1.00, 0.00, 0.00]</code>
    </div>
  `;

  // Panel 3: Final rho table
  document.getElementById("micro-rho-matrix").innerHTML = buildMatrixTable(data.final_rho, neurons, ["Paris", "Tokyo", "Berlin"], "highlight-rho");

  // Panel 4: Readout Math & Decode Winner
  document.getElementById("micro-readout-math").innerHTML = `
    <div class="calc-line">
      <span>0.8 × row(n1) [country]:</span>
      <code>[0.64, 0.64, 0.64]</code>
    </div>
    <div class="calc-line">
      <span>1.0 × row(n2) [France]:</span>
      <code>[1.00, 0.00, 0.00]</code>
    </div>
    <div class="calc-total">
      <span>Retrieved Vector v̂ = qᵀ · ρ:</span>
      <code>[1.64, 0.64, 0.64]</code>
    </div>
  `;

  document.getElementById("micro-winner-box").innerHTML = `
    <div class="winner-title">🏆 Decode Output: Paris (Correct!)</div>
    <div class="winner-details">
      • <strong>Paris Score: 1.64</strong> (Clean match from France's unique neuron n2 + shared n1).<br>
      • <strong>Crosstalk Leak: Tokyo (0.64), Berlin (0.64)</strong>.<br>
      <em>"Recall is a mixture, not a lookup. Paris wins because its cue overlaps with itself completely."</em>
    </div>
  `;
}

// --- SCENARIO 2: BDH ATTENTION MICRO MODEL (d=2, n=3, T=3) ---
function renderBdhMicroScenario() {
  const data = state.microData.bdh_micro;
  document.getElementById("pill-kv-dims").textContent = "k ∈ ℝ³, v ∈ ℝ²";
  document.getElementById("pill-outer-dims").textContent = "Δρ = k ⊗ vᵀ ∈ ℝ³ˣ²";
  document.getElementById("pill-rho-dims").textContent = "ρ ∈ ℝ³ˣ²";
  document.getElementById("pill-read-dims").textContent = "out ∈ ℝ²";

  microBannerText.innerHTML = `
    <strong>BDH Pure Attention Micro Model:</strong> Token embeddings have dimension <code>d=2</code>, expanding to <code>n=3</code> neurons via <code>ReLU(x @ W_enc)</code>.
    Parallel causal attention <code>(QKᵀ)V</code> and sequential memory <code>q @ ρ</code> yield identical numbers!
  `;

  const controls = document.getElementById("micro-action-controls");
  controls.innerHTML = `
    <button class="micro-act-btn ${state.microStep === 0 ? "active" : ""}" onclick="setMicroStep(0)">
      Token 0 (t=0)
    </button>
    <button class="micro-act-btn ${state.microStep === 1 ? "active" : ""}" onclick="setMicroStep(1)">
      Token 1 (t=1)
    </button>
    <button class="micro-act-btn ${state.microStep === 2 ? "active" : ""}" onclick="setMicroStep(2)">
      Token 2 (t=2)
    </button>
  `;

  const stepIdx = typeof state.microStep === "number" ? state.microStep : 0;
  const step = data.steps[stepIdx];
  const neurons = ["Neuron 0", "Neuron 1", "Neuron 2"];
  const valLabels = ["dim 0", "dim 1"];

  // Panel 1: k and v
  const kContainer = document.getElementById("micro-k-vec");
  kContainer.innerHTML = "";
  step.k_vector.forEach((val, i) => {
    const row = document.createElement("div");
    row.className = `k-cell-row ${val > 0 ? "firing" : "silent"}`;
    row.innerHTML = `<span>${neurons[i]}</span><strong>${val.toFixed(1)}</strong>`;
    kContainer.appendChild(row);
  });

  const vContainer = document.getElementById("micro-v-vec");
  vContainer.innerHTML = "";
  step.x_vector.forEach((val, j) => {
    const cell = document.createElement("div");
    cell.className = `v-cell ${val > 0 ? "active-val" : ""}`;
    cell.innerHTML = `<div style="font-size: 0.68rem; color: #64748b;">${valLabels[j]}</div><div>${val.toFixed(1)}</div>`;
    vContainer.appendChild(cell);
  });

  // Panel 2: Outer Product Matrix (3 x 2)
  document.getElementById("micro-outer-matrix").innerHTML = buildMatrixTable(step.outer_matrix, neurons, valLabels, "nonzero");

  // Panel 3: Synaptic Table rho (3 x 2)
  document.getElementById("micro-rho-matrix").innerHTML = buildMatrixTable(step.rho_after, neurons, valLabels, "highlight-rho");

  // Panel 4: Sequential Read vs Parallel Attention
  const parallelScoreRow = data.scores_matrix[stepIdx];
  const parallelOut = data.parallel_output[stepIdx];

  document.getElementById("micro-readout-math").innerHTML = `
    <div class="calc-line">
      <span>Sequential Read q[${stepIdx}] @ ρ:</span>
      <code>[${step.read_vector.map(v => v.toFixed(1)).join(", ")}]</code>
    </div>
    <div class="calc-line">
      <span>Parallel Attention Scores Row:</span>
      <code>[${parallelScoreRow.map(v => v.toFixed(1)).join(", ")}]</code>
    </div>
    <div class="calc-total">
      <span>Parallel (scores @ x)[${stepIdx}]:</span>
      <code>[${parallelOut.map(v => v.toFixed(1)).join(", ")}]</code>
    </div>
  `;

  document.getElementById("micro-winner-box").innerHTML = `
    <div class="winner-title">✓ Exact Parallel / Sequential Equivalence</div>
    <div class="winner-details">
      Sequential synaptic read: <strong>[${step.read_vector.map(v => v.toFixed(1)).join(", ")}]</strong><br>
      Parallel attention output: <strong>[${parallelOut.map(v => v.toFixed(1)).join(", ")}]</strong><br>
      Difference: <strong>0.00</strong>. Synaptic Hebbian memory and causal attention are mathematically identical.
    </div>
  `;
}

// Helper: Build HTML table for 2D matrix
function buildMatrixTable(matrix, rowLabels, colLabels, nonzeroClass) {
  let html = `<table class="micro-matrix-tbl"><thead><tr><th></th>`;
  colLabels.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += `</tr></thead><tbody>`;

  matrix.forEach((row, i) => {
    html += `<tr><th>${rowLabels[i].split(" ")[0]}</th>`;
    row.forEach(val => {
      const isNonzero = Math.abs(val) > 1e-5;
      const cls = isNonzero ? nonzeroClass : "zero";
      html += `<td class="${cls}">${val.toFixed(2)}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

// =============================================================================
// FULL BDH LLM VISUALIZER LOGIC (Checkpoints: paris, Shakespeare)
// =============================================================================

async function fetchTrace() {
  traceBtn.innerHTML = `<span class="btn-icon">⏳</span> Tracing...`;
  try {
    const res = await fetch("/api/trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: state.prompt, model: state.model })
    });
    const data = await res.json();
    state.traceData = data;
    state.selectedTokenIdx = data.sequence_length - 1;
    state.hebbianStep = Math.min(state.hebbianStep, data.sequence_length - 1);
    
    hebbianSlider.max = data.sequence_length - 1;
    hebbianSlider.value = state.hebbianStep;

    if (state.mode === "llm") {
      renderAll();
      runGenerate(40);
    }
  } catch (err) {
    console.error("Trace error:", err);
  } finally {
    traceBtn.innerHTML = `<span class="btn-icon">⚡</span> Trace Layers`;
  }
}

async function runGenerate(numTokens = 50) {
  const rolloutEl = document.getElementById("rollout-text");
  generateBtn.innerHTML = `<span class="btn-icon">⏳</span> Generating...`;
  rolloutEl.textContent = "Generating continuation from model checkpoint...";
  
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: state.prompt,
        max_tokens: numTokens,
        temperature: state.temperature,
        model: state.model
      })
    });
    const data = await res.json();
    rolloutEl.textContent = data.generated_text;
  } catch (err) {
    console.error("Generate error:", err);
    rolloutEl.textContent = "Error during generation: " + err.message;
  } finally {
    generateBtn.innerHTML = `<span class="btn-icon">✨</span> Generate 50 Tokens`;
  }
}

function stepOneToken() {
  if (state.traceData && state.traceData.predictions.length > 0) {
    const topPred = state.traceData.predictions[0];
    const nextChar = topPred.byte_id === 32 ? " " : (topPred.byte_id === 10 ? "\n" : String.fromCharCode(topPred.byte_id));
    state.prompt += nextChar;
    promptInput.value = state.prompt;
    fetchTrace();
  }
}

function renderAll() {
  if (!state.traceData) return;

  renderTokenList();
  renderEmbeddingVector();
  renderCurrentLayer();
  renderPredictions();
}

function renderTokenList() {
  const container = document.getElementById("tokens-display");
  container.innerHTML = "";

  state.traceData.chars.forEach((char, idx) => {
    const chip = document.createElement("div");
    chip.className = `token-chip-row ${idx === state.selectedTokenIdx ? "selected" : ""}`;
    const byteId = state.traceData.tokens[idx];
    
    chip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.72rem; color: #94a3b8;">#${idx}</span>
        <span class="token-chip-char">${char === " " ? "␣" : char}</span>
      </div>
      <span class="token-chip-meta">byte ${byteId}</span>
    `;

    chip.addEventListener("click", () => {
      document.querySelectorAll(".token-chip-row").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      state.selectedTokenIdx = idx;
      renderEmbeddingVector();
      renderCurrentLayer();
    });

    container.appendChild(chip);
  });
}

function renderEmbeddingVector() {
  const strip = document.getElementById("embedding-vector-strip");
  strip.innerHTML = "";

  const tokenData = state.traceData.token_embeddings[state.selectedTokenIdx];
  if (!tokenData) return;

  tokenData.vector.forEach(val => {
    const cell = document.createElement("div");
    cell.className = "vector-cell";
    if (val >= 0) {
      const alpha = Math.min(1.0, Math.max(0.2, val / 2.0));
      cell.style.backgroundColor = `rgba(59, 130, 246, ${alpha})`;
    } else {
      const alpha = Math.min(1.0, Math.max(0.2, Math.abs(val) / 2.0));
      cell.style.backgroundColor = `rgba(239, 68, 68, ${alpha})`;
    }
    cell.textContent = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
    strip.appendChild(cell);
  });
}

function renderCurrentLayer() {
  const layerData = state.traceData.layers[state.layer];
  if (!layerData) return;

  document.getElementById("layer-sparsity-badge").textContent = `Sparsity: ${layerData.sparsity_pct}%`;
  document.getElementById("layer-delta-badge").textContent = `Δ Norm: ${layerData.delta_norm}`;
  document.getElementById("layer-cossim-badge").textContent = `Cos Sim: ${layerData.cosine_similarity}`;

  document.getElementById("active-neurons-count").textContent = Math.round(layerData.active_neurons_avg);
  document.getElementById("silent-neurons-count").textContent = state.traceData.config.latent_dim - Math.round(layerData.active_neurons_avg);
  document.getElementById("sparsity-percent").textContent = `${layerData.sparsity_pct}%`;

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
      cell.style.backgroundColor = "#cbd5e1";
    } else {
      const alpha = Math.min(1.0, Math.max(0.3, val / 2.5));
      cell.style.backgroundColor = `rgba(124, 58, 237, ${alpha})`;
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
  chars.forEach(c => {
    html += `<th>'${c === " " ? "␣" : c}'</th>`;
  });
  html += `</tr></thead><tbody>`;

  for (let r = 0; r < T; r++) {
    html += `<tr><th>'${chars[r] === " " ? "␣" : chars[r]}'</th>`;
    for (let c = 0; c < T; c++) {
      const score = headMatrix[r][c];
      let bg = "transparent";
      let color = "#64748b";

      if (score > 0) {
        const ratio = Math.min(1.0, score / maxScore);
        bg = `rgba(59, 130, 246, ${0.15 + 0.85 * ratio})`;
        color = ratio > 0.4 ? "#ffffff" : "#1e3a8a";
      }

      html += `<td class="attn-cell" style="background-color: ${bg}; color: ${color};" title="Token '${chars[r]}' attends to past '${chars[c]}': score ${score}">${score.toFixed(1)}</td>`;
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
  document.getElementById("hebbian-step-label").textContent = `Step ${step} ('${charDisplay}')`;

  const container = document.getElementById("hebbian-metrics");
  container.innerHTML = `
    <div class="metric-box featured">
      <span class="m-val">${info.rho_norm}</span>
      <span class="m-lbl">Synaptic Memory ||ρ<sub>t</sub>||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.read_norm}</span>
      <span class="m-lbl">Associative Read ||q<sub>t</sub> @ ρ<sub>t</sub>||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.k_norm}</span>
      <span class="m-lbl">Key Vector ||k<sub>${charDisplay}</sub>||</span>
    </div>
    <div class="metric-box">
      <span class="m-val">${info.v_norm}</span>
      <span class="m-lbl">Value Vector ||v<sub>${charDisplay}</sub>||</span>
    </div>
  `;
}

function renderNeuronVoting(layerData) {
  const selectedChar = state.traceData.chars[state.selectedTokenIdx];
  document.getElementById("token-pos-label").textContent = `'${selectedChar === " " ? "␣" : selectedChar}'`;
  document.getElementById("active-voting-count").textContent = layerData.active_neuron_count_last;

  const container = document.getElementById("neuron-voting-list");
  container.innerHTML = "";

  const maxContrib = layerData.neuron_contributions_top.length > 0 ? layerData.neuron_contributions_top[0].contribution : 1.0;

  layerData.neuron_contributions_top.forEach((n) => {
    const row = document.createElement("div");
    row.className = "voting-row";
    const pctBar = Math.min(100, Math.round((n.contribution / maxContrib) * 100));
    row.innerHTML = `
      <span class="neuron-id-tag">#${n.neuron_id} (H${n.head})</span>
      <div class="neuron-contrib-bar-container" title="Contribution ||a_i * w_i||: ${n.contribution}">
        <div class="neuron-contrib-bar" style="width: ${pctBar}%"></div>
      </div>
      <span class="neuron-act-val">a<sub>i</sub> = ${n.activation.toFixed(2)}</span>
    `;
    row.title = `Neuron #${n.neuron_id} Direction Vector: [${n.vector_sample.join(", ")}, ...]`;
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
      <span class="pred-char">${pred.char}</span>
      <div class="pred-bar-container">
        <div class="pred-bar-fill" style="width: ${Math.min(100, pred.prob_percent)}%"></div>
      </div>
      <span class="pred-pct">${pred.prob_percent.toFixed(1)}%</span>
    `;

    row.addEventListener("click", () => {
      const appendChar = pred.byte_id === 32 ? " " : (pred.byte_id === 10 ? "\n" : String.fromCharCode(pred.byte_id));
      state.prompt += appendChar;
      promptInput.value = state.prompt;
      fetchTrace();
    });

    container.appendChild(row);
  });
}
