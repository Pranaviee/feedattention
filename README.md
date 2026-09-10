<p align="center">
  <img src="images/synapse.jpg" alt="BDH Synaptic Plasticity & Biological Memory" width="100%" style="border-radius: 8px;" />
</p>

# Synaptic Plasticity & In-Context Recall Collapse
### Bridging Transformer Attention with Biologically Grounded Hebbian Working Memory

**Team feedattention**  
*Pranavi Gottumukkala & Suday Nandan Reddy Samala*  
*Indian Institute of Technology, Kharagpur*

[![Live Demo](https://img.shields.io/badge/Live_Explainer-Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://dataforgeweb.pages.dev)
[![API Status](https://img.shields.io/badge/API_Status-Render_Healthy-46E3B7?style=flat-square&logo=render&logoColor=black)](https://sudaynandan.onrender.com/health)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.8_CPU%2FMPS-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![React](https://img.shields.io/badge/Frontend-React_18_%7C_Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Paper Reference](https://img.shields.io/badge/Paper-arXiv%3A2509.26507-b31b1b?style=flat-square)](https://doi.org/10.48550/arXiv.2509.26507)

---

## Overview

Modern sequence models face a critical trade-off between memory footprint and in-context learning capability during inference. Standard Transformers store context by explicitly appending Key-Value (KV) vectors to an ever-growing cache, incurring a linear $O(t)$ memory cost and quadratic $O(t^2)$ attention computational complexity. Non-Hebbian alternatives such as State-Space Models (SSMs, like Mamba) and recurrent architectures (like xLSTM) compress sequence history into a fixed-size hidden state vector, but because their transition matrices are frozen at inference, squeezing an unbounded stream of information into a static activation vector causes exponential decay.

**Biological Working Memory via Synaptic Plasticity:**  
The human brain does not preserve a growing historical list of previous activation states, nor does it squeeze context into frozen vector paths. Instead, biological working memory relies on **synaptic plasticity**—the temporary, activity-dependent strengthening of connections (synapses) between neurons. 

In the **Dragon Hatchling (BDH)** architecture (Kosowski et al., 2025), this biological principle is translated into dynamic "fast-weights" that update at test time:
* **Constant State Size ($n \times d$)**: Rather than retaining an expanding KV cache, associations are directly stored by updating an unnormalized synaptic weight matrix ($W_t = W_{t-1} + k_t v_t^\top$) that never grows in size.
* **Falsifiable Scientific Claim**: *A fixed-size synaptic memory can encode unbounded associations, but recall degrades with increasing load and deteriorates sharply when stored cues overlap.*
* **Interactive Educational Tool**: Designed for students, researchers, and newcomers to machine learning and neuroscience, our accompanying web tool helps learners visualize neuronal connections, layer-wise sparsity patterns, and mathematical synaptic updates in real time.

---

## Live Deployments

| Service | Hosting | Status | Link |
| :--- | :---: | :---: | :--- |
| Interactive Web Explainer | Cloudflare Workers / Pages | Active | [dataforgeweb.pages.dev](https://dataforgeweb.pages.dev) |
| Live Checkpoint API | Render (Docker / CPU PyTorch) | Active | [sudaynandan.onrender.com/health](https://sudaynandan.onrender.com/health) |

---

## Theoretical Foundations

<p align="center">
  <img src="bdh_ref/figs/architecture.png" alt="BDH Architecture Diagram" width="85%" />
</p>

### 1. Replaying KV-Cache as a Synaptic Weight Matrix

Standard Transformers apply row-wise softmax across attention matrices: $\text{Attention}(Q, K, V) = \text{softmax}(Q K^\top / \sqrt{d}) V$. 

In BDH, causal unnormalized linear attention ties queries and keys directly to a sparse positive neuronal activation vector $Q_t = K_t = x_t \in \mathbb{R}_{\ge 0}^{1 \times n}$, with projected values $V_t = v_t \in \mathbb{R}^{1 \times d}$. Token retrieval is governed by:

$$Y_t = \sum_{\tau \le t} (Q_t K_\tau^\top) V_\tau$$

As activations enter the network, historical associations accumulate directly into the synaptic weight matrix $\sigma_t \in \mathbb{R}^{n \times d}$ via outer-product Hebbian updates modulated by a retention decay $\lambda \in (0, 1]$:

$$\sigma_t = \lambda \sigma_{t-1} + x_t^\top v_t = \sum_{\tau \le t} \lambda^{t-\tau} x_\tau^\top v_\tau$$

When the current activation $x_t$ enters the circuit, retrieval occurs simply by driving the signal forward through these accumulated synaptic weights:

$$y_t = x_t \sigma_t = x_t \left( \sum_{\tau \le t} \lambda^{t-\tau} x_\tau^\top v_\tau \right) = \sum_{\tau \le t} \lambda^{t-\tau} (x_t x_\tau^\top) v_\tau = \sum_{\tau \le t} \lambda^{t-\tau} (Q_t K_\tau^\top) V_\tau$$

By the associativity of matrix multiplication, $x_t (x_\tau^\top v_\tau) = (x_t x_\tau^\top) v_\tau$. Propagating an activation through the dynamic synaptic matrix is strictly isomorphic to causal linear attention ($\lambda = 1$ recovering $Y_t$ exactly). In [`tests/verify_hebbian_equivalence.py`](tests/verify_hebbian_equivalence.py), we empirically verify that this difference is bounded by floating-point error:

$$\max |Y_{\text{parallel}} - Y_{\text{Hebbian}}| < 10^{-15}$$

---

### 2. Superposition Noise and Recall Collapse

Accumulating $t$ associations into a fixed-size synaptic matrix comes with additive superposition noise. When querying with key $K_q$ at an earlier index $q < t$, the readout decomposes as:

$$a^*_q = K_q \rho_t = \underbrace{\|K_q\|^2 V_q}_{\text{Target Signal}} + \underbrace{\sum_{j \neq q} (K_q K_j^\top) V_j}_{\text{Cross-Talk Superposition Noise}}$$

Under Claim 8 (Appendix C.2 of the BDH paper), for a constant neuron count $n$ and key correlation $C$, the $L_2$ reconstruction error of the retrieved attention vector scales as:

$$\text{Error}(\|a^*_t - a_t\|_2) = O(\sqrt{\delta}), \quad \text{where } \delta > \frac{t \cdot (C + 1) \log n}{n}$$

* **Independent Cues ($C = 0$)**: When keys are near-orthogonal, cross-talk noise grows slowly ($O(\sqrt{t})$), maintaining stable recall across moderate sequence lengths.
* **Correlated Cues ($C > 0$)**: When keys share correlation, positive drift accumulates constructively across timesteps, accelerating recall collapse well before sequence length approaches latent dimension $n$.

<p align="center">
  <img src="results/checkpoint_correlation_recall_collapse.png" alt="Checkpoint Recall Collapse Benchmark" width="90%" />
</p>

*Empirical recall collapse measured on checkpoint `bdh_d128.pt` across context lengths $t \in [10, 300]$ and key correlation values $C \in [0.0, 0.9]$.*

---

### 3. Computational Cost: Transformer vs. Recurrent BDH

| Context Regime | Transformer Attention | Recurrent BDH | Lower Complexity |
| :--- | :---: | :---: | :---: |
| $T \gg n$ | $O(T^2 d)$ | $O(T n d)$ | **BDH (Linear in context length $T$)** |
| $T \ll n$ | $O(T^2 d)$ | $O(T n d)$ | **Transformer** |
| $T = n$ | $O(n^2 d)$ | $O(n^2 d)$ | Same leading-order cost |

*Per-layer sequence-mixing costs; recurrent BDH evaluation assumed during inference.*

---

## Setup & Reproduction Guide

### Prerequisites
* Python 3.9+ (Python 3.10+ recommended)
* Node.js 18+ and npm

```bash
git clone https://github.com/Pranaviee/dataforge_model.git
cd dataforge_model
```

---

### Running the Web Explainer Locally

The interactive web explainer includes narrative visualizers and an embedded inspector that queries the trained checkpoints.

```bash
cd web
npm install
npm run dev
```

* The React explainer runs at `http://localhost:5173`.
* Vite starts the local Python inference server (`web/livemodel/server.py`) in the background on port `8765`.
* Web requests to `/api/*` are proxied to the Python backend automatically.

---

### Machine Learning Benchmarks & Verification

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

#### 1. Mathematical Equivalence Proof
Verify that parallel attention matches the sequential Hebbian loop to machine precision:
```bash
python3 tests/verify_hebbian_equivalence.py
```

#### 2. Model Training on TinyShakespeare
Train BDH configurations from scratch:
```bash
# Train d=64 model (4 layers, 4 heads, N=1024)
python3 train_bdh_tinyshakespeare.py --d 64 --iters 800

# Train d=128 model (4 layers, 4 heads, N=2048)
python3 train_bdh_tinyshakespeare.py --d 128 --iters 800
```

#### 3. Checkpoint Recall Collapse Benchmark
Measure retrieval degradation across context lengths and correlation factors:
```bash
python3 tests/eval_checkpoint_correlation_graph.py
```
Outputs and plots are written to [`results/`](results/).

#### 4. Command-Line Inference & State Inspection
```bash
# Text generation with temperature sampling
python3 inference.py --prompt "ROMEO: " --model bdh_d128.pt

# Layer-by-layer tensor inspection
python3 tests/inspect_bdh_step_by_step.py --prompt "paris" --checkpoint bdh_d64.pt
```

---

## Checkpoints & Model Configurations

Trained checkpoints are stored in the repository for immediate evaluation:

| Checkpoint | Embedding Dim ($d$) | Layers | Heads | Latent Dim ($n$) | Parameters | Checkpoint Size |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [`bdh_d64.pt`](bdh_d64.pt) | 64 | 4 | 4 | 1,024 | ~820K | ~3.3 MB |
| [`bdh_d128.pt`](bdh_d128.pt) | 128 | 4 | 4 | 2,048 | ~3.2M | ~12.9 MB |

---

## Repository Structure

```text
├── README.md                              # Project documentation
├── requirements.txt                       # Core Python dependencies
├── images/                                # Project visual assets
│   └── synapse.jpg                        # Hero banner
├── train_bdh_tinyshakespeare.py           # BDH training pipeline
├── inference.py                           # CLI interactive text generation
├── input.txt                              # TinyShakespeare dataset (~1.1 MB)
├── bdh_d64.pt                             # Checkpoint for BDH d=64
├── bdh_d128.pt                            # Checkpoint for BDH d=128
│
├── results/                               # Benchmark reports, CSVs, and figures
│   ├── checkpoint_correlation_recall_collapse.png
│   ├── key_correlation_recall_collapse.png
│   ├── checkpoint_recall_collapse_data.csv
│   └── checkpoint_recall_collapse_report.md
│
├── tests/                                 # Verification test suite
│   ├── verify_hebbian_equivalence.py      # Equivalence proof (< 1e-15 error)
│   ├── eval_checkpoint_correlation_graph.py
│   ├── inspect_bdh_step_by_step.py        # Layer-by-layer tensor inspector
│   ├── plot_correlation_collapse.py
│   └── sample_checkpoints.py
│
├── web/                                   # Interactive web explainer (React + Vite)
│   ├── src/                               # Frontend source (Tailwind, Visx, KaTeX)
│   ├── livemodel/                         # Zero-dependency Python inference microservice
│   │   ├── server.py                      # ThreadingHTTPServer API
│   │   ├── bdh.py                         # Standalone BDH loader
│   │   ├── index.html & app.js            # Standalone inspector interface
│   │   └── bdh_d64.pt & bdh_d128.pt       # Checkpoint files for Docker deployment
│   ├── Dockerfile                         # Slim CPU-only PyTorch container
│   ├── render.yaml                        # Render Web Service Blueprint
│   ├── wrangler.toml                      # Cloudflare Workers configuration
│   ├── worker.js                          # Cloudflare edge reverse proxy
│   └── package.json                       # Frontend dependencies and scripts
│
└── bdh_ref/                               # Reference implementation (Pathway BDH)
```

---

## References & Citations

### Primary Relevant Research Papers

```bibtex
@article{kosowski2025dragon,
  title={The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain},
  author={Kosowski, Adrian and Uzna{\'n}ski, Przemys{\l}aw and Chorowski, Jan and Stamirowska, Zuzanna and Bartoszkiewicz, Micha{\l}},
  journal={arXiv preprint arXiv:2509.26507},
  year={2025},
  url={https://arxiv.org/abs/2509.26507}
}

@inproceedings{beck2024xlstm,
  title={xLSTM: Extended Long Short-Term Memory},
  author={Beck, Maximilian and P{\"o}ppel, Korbinian and Spanring, Markus and Auer, Andreas and Prudnikova, Oleksandra and Kopp, Michael and Klambauer, G{\"u}nter and Brandstetter, Johannes and Hochreiter, Sepp},
  booktitle={Advances in Neural Information Processing Systems (NeurIPS)},
  year={2024},
  url={https://arxiv.org/abs/2405.04517}
}

@article{mitropolsky2025simulated,
  title={Simulated Language Acquisition in a Biologically Realistic Model of the Brain},
  author={Mitropolsky, Daniel and Papadimitriou, Christos H.},
  journal={bioRxiv preprint},
  year={2025},
  doi={10.1101/2025.07.15.664996}
}
```

### Extended Bibliographic References

1. **A. Kosowski et al.** *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain.* arXiv:2509.26507, 2025.
2. **Pathway.** *BDH (Dragon Hatchling): Official Code Repository.* [github.com/pathwaycom/bdh](https://github.com/pathwaycom/bdh).
3. **Amit Singh Bhatti.** *Neurosynaptic plasticity—The cell assembly theory.* Medium, 2021.
4. **A. Vaswani et al.** *Attention Is All You Need.* Advances in Neural Information Processing Systems (NeurIPS), arXiv:1706.03762, 2017.
5. **A. Gu and T. Dao.** *Mamba: Linear-Time Sequence Modeling with Selective State Spaces.* arXiv:2312.00752, 2023.
6. **M. Beck et al.** *xLSTM: Extended Long Short-Term Memory.* NeurIPS, arXiv:2405.04517, 2024.
7. **N. F. Liu et al.** *Lost in the Middle: How Language Models Use Long Contexts.* Transactions of the Association for Computational Linguistics, arXiv:2307.03172, 2023.
8. **D. Mitropolsky and C. H. Papadimitriou.** *Simulated Language Acquisition in a Biologically Realistic Model of the Brain.* bioRxiv preprint, doi:10.1101/2025.07.15.664996, 2025.
9. **B. Engdahl et al.** *BDH-CQ: In-Context Learning with Recurrent Latent Reasoning.* arXiv:2608.09888, 2026.

---

## AI & Asset Disclosures

### Generative AI Usage
* **Summary & Text Editing**: `prism.openai` was used for editorial refinement and structure drafting of the one-page research summary document.
* **Code Implementation & Pair Programming**: Google Antigravity and Claude Code were used for codebase consolidation, development assistance, and web component scaffolding.
* **Literature Exploration & Research**: Connected Papers and Google Gemini were utilized during the research phase for paper discovery, citation mapping, and theoretical cross-referencing.
* **Authenticity & Independent Verification**: All core model training logic, recurrent Hebbian loop implementations, mathematical equivalence proofs, and empirical recall collapse evaluations were implemented, executed, and verified empirically against the theoretical claims in the original research papers.

### Third-Party Assets & Frameworks
* **Machine Learning Stack**: PyTorch (`torch`), NumPy (`numpy`), Matplotlib (`matplotlib`).
* **Frontend Web Application**: React 18, Vite, TypeScript, TailwindCSS, KaTeX (mathematical typesetting), Visx & Recharts (data visualization), Motion & Anime.js (interactive animations).
* **Dataset**: TinyShakespeare dataset (public domain, Andrej Karpathy).
* **Reference Upstream**: Official Pathway BDH repository ([pathwaycom/bdh](https://github.com/pathwaycom/bdh)).
