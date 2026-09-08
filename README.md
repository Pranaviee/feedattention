# BDH: Synaptic Plasticity & In-Context Recall Collapse

Reproduction, mathematical validation, and empirical benchmarking of Pathway's **BDH (Baby Dragon Hatchling)** architecture and the research findings from *"The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain"* (Kosowski et al., arXiv 2025).

---

## Table of Contents

- [Overview](#overview)
- [Theoretical Foundations](#theoretical-foundations)
  - [1. Synaptic Plasticity as Attention](#1-synaptic-plasticity-as-attention)
  - [2. Superposition Noise & Recall Collapse](#2-superposition-noise--recall-collapse)
  - [3. Key Correlation Acceleration](#3-key-correlation-acceleration)
- [Empirical Results](#empirical-results)
  - [Mathematical Equivalence Proof](#mathematical-equivalence-proof)
  - [Checkpoint Recall Collapse Benchmark](#checkpoint-recall-collapse-benchmark)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [1. Training BDH on TinyShakespeare](#1-training-bdh-on-tinyshakespeare)
  - [2. Checkpoint Recall Collapse Evaluation](#2-checkpoint-recall-collapse-evaluation)
  - [3. Text Generation & Prompt Inspection](#3-text-generation--prompt-inspection)
- [Checkpoints](#checkpoints)
- [References & Citation](#references--citation)

---

## Overview

Standard Transformer architectures utilize softmax-normalized, all-to-all attention requiring global state synchronization. In contrast, **BDH (Baby Dragon Hatchling)** introduces a biologically grounded neural network architecture featuring:
- **Hebbian Working Memory**: Synaptic plasticity implemented as unnormalized outer-product associations.
- **Sparse Positive Activations**: Non-linear ReLU expansions enabling monosemantic, interpretable latent representations.
- **Scale-Free Structural Dynamics**: Local neuron-to-neuron communication with linear state-space efficiency.

---

## Theoretical Foundations

### 1. Synaptic Plasticity as Attention

In BDH, causal attention operates without softmax normalization:

$$\mathbf{Scores} = \text{tril}(Q K^\top, -1), \quad Y = \mathbf{Scores} \cdot V$$

where $K \equiv Q$. This parallel matrix formulation is mathematically identical to a sequential, step-by-step Hebbian write and associative read loop:

```python
rho = np.zeros((n, d))
for t in range(T):
    out[t] = q[t] @ rho         # Associative Read
    rho += np.outer(k[t], v[t])  # Hebbian Write
```

In [`verify_hebbian_equivalence.py`](verify_hebbian_equivalence.py), we verify that the numerical difference between parallel causal attention and the sequential Hebbian loop is:

$$\max |Y_{\text{parallel}} - Y_{\text{Hebbian}}| < 10^{-15}$$

---

### 2. Superposition Noise & Recall Collapse

When accumulating $t$ associations into a fixed-size synaptic matrix $\rho_t = \sum_{\tau < t} K_\tau V_\tau^\top$, querying with key $K_q$ at historical step $q < t$ yields:

$$a^*_q = K_q \rho_t = \|K_q\|^2 V_q + \sum_{j \neq q} (K_q K_j^\top) V_j$$

- **Signal**: The target association $\|K_q\|^2 V_q$.
- **Cross-Talk Noise**: The sum over all other stored patterns $\sum_{j \neq q} (K_q K_j^\top) V_j$.

Because memories are summed directly on top of each other, additive superposition noise degrades retrieval as context length increases. Under a constant neuron count $n$ and key correlation $C$ (Claim 8, Appendix C.2 of the BDH paper), the $L_2$ reconstruction error of the retrieved attention vector scales as:

$$\text{Error}(\|a^*_t - a_t\|_2) = O(\sqrt{\delta}), \quad \text{where } \delta > \frac{t \cdot (C + 1) \log n}{n}$$

---

### 3. Key Correlation Acceleration

When keys are independent ($C = 0$), cross-talk terms have zero mean and near-orthogonal firing, maintaining stable recall across moderate sequence lengths. When keys share correlation ($C > 0$), positive drift accumulates constructively across steps, accelerating recall collapse well before sequence length reaches latent dimension $n$.

---

## Empirical Results

### Mathematical Equivalence Proof

Verify that parallel causal attention matches sequential Hebbian updates:

```bash
python3 verify_hebbian_equivalence.py
```

Output:
```text
Max difference between parallel BDH attention and sequential Hebbian loop: 1.11e-16
Exact match: BDH unnormalized causal attention is mathematically identical to Hebbian synaptic plasticity.
```

---

### Checkpoint Recall Collapse Benchmark

Evaluated directly on the trained checkpoint `bdh_d128.pt` ($n=2048$ per head, $d=128$):

![Recall Collapse](checkpoint_correlation_recall_collapse.png)

Full numerical tables and architectural descriptions are provided in [`checkpoint_recall_collapse_data.csv`](checkpoint_recall_collapse_data.csv) and [`checkpoint_recall_collapse_report.md`](checkpoint_recall_collapse_report.md).

---

## Repository Structure

```text
├── README.md                              # Project documentation
├── verify_hebbian_equivalence.py          # Parallel attention vs Hebbian equivalence check
├── train_bdh_tinyshakespeare.py           # BDH training pipeline (Apple Silicon MPS / CUDA / CPU)
├── eval_checkpoint_correlation_graph.py   # Empirical checkpoint recall & L2 error benchmark
├── plot_correlation_collapse.py           # Theoretical simulation of Claim 8 recall collapse
├── inference.py                           # CLI interactive text generation engine
├── inspect_bdh_step_by_step.py            # Layer-by-layer tensor inspector
├── checkpoint_correlation_recall_collapse.png # Empirical benchmark plot
├── checkpoint_recall_collapse_data.csv    # Raw benchmark CSV data
├── checkpoint_recall_collapse_report.md   # Architectural report and evaluation table
├── input.txt                              # TinyShakespeare dataset (~1.1 MB)
├── bdh_d64.pt                             # Checkpoint for BDH d=64 model
├── bdh_d128.pt                            # Checkpoint for BDH d=128 model
└── bdh_ref/                               # Upstream reference implementation (Pathway BDH)
```

---

## Getting Started

### 1. Training BDH on TinyShakespeare

Train a model from scratch with custom dimensions:

```bash
# Train d=64 model
python3 train_bdh_tinyshakespeare.py --d 64 --iters 800

# Train d=128 model
python3 train_bdh_tinyshakespeare.py --d 128 --iters 800
```

### 2. Checkpoint Recall Collapse Evaluation

Evaluate retrieval accuracy and normalized $L_2$ error across context lengths $t \in [10, 300]$:

```bash
python3 eval_checkpoint_correlation_graph.py
```

### 3. Text Generation & Prompt Inspection

Run text generation or step-by-step tensor inspection:

```bash
# Text generation
python3 inference.py --prompt "To be or not to " --model bdh_d128.pt

# Interactive inspection
python3 inspect_bdh_step_by_step.py --prompt "paris" --checkpoint bdh_d64.pt
```

---

## Checkpoints

| Checkpoint | Embedding Dim ($d$) | Layers | Heads | Latent Dim ($N$) | File Size |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `bdh_d64.pt` | 64 | 4 | 4 | 1024 | ~3.3 MB |
| `bdh_d128.pt` | 128 | 4 | 4 | 2048 | ~12.9 MB |

---

## References & Citation

1. **Pathway BDH Paper**:
   > A. Kosowski, P. Uznański, J. Chorowski, Z. Stamirowska, M. Bartoszkiewicz.
   > *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain.*
   > [arXiv:2509.26507 (2025)](https://doi.org/10.48550/arXiv.2509.26507).
   > Official repository: [pathwaycom/bdh](https://github.com/pathwaycom/bdh).
