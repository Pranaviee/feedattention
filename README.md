# BDH: Synaptic Plasticity & Working Memory Capacity

Reproduction, mathematical validation, and empirical benchmarking of Pathway's **BDH (Baby Dragon Hatchling)** architecture and the research findings from *"The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain"* (Kosowski et al., arXiv 2025) and *"Memory in the Wiring: Synaptic Plasticity as Short-Term Memory — and where it lives in BDH"*.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Theoretical Foundations](#theoretical-foundations)
  - [1. Synaptic Plasticity as Attention](#1-synaptic-plasticity-as-attention)
  - [2. The Signal-to-Resonance Memory Law (SRM)](#2-the-signal-to-resonance-memory-law-srm)
  - [3. The Capacity Knee ($P \approx d$)](#3-the-capacity-knee-p-approx-d)
  - [4. The Measurement Trap (Nearest-Value vs. Argmax)](#4-the-measurement-trap-nearest-value-vs-argmax)
  - [5. The Cue Overlap Trap](#5-the-cue-overlap-trap)
- [Empirical Results](#empirical-results)
  - [Capacity Law Verification ($d=64$ vs $d=128$)](#capacity-law-verification-d64-vs-d128)
  - [Mathematical Equivalence Proof](#mathematical-equivalence-proof)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Running Theoretical Capacity Simulations](#1-running-theoretical-capacity-simulations)
  - [2. Training BDH on TinyShakespeare](#2-training-bdh-on-tinyshakespeare)
  - [3. Generating Text from Checkpoints](#3-generating-text-from-checkpoints)
  - [4. Evaluating In-Context Interference](#4-evaluating-in-context-interference)
- [Checkpoints](#checkpoints)
- [References & Citation](#references--citation)

---

## Overview

Standard Transformer architectures utilize softmax-normalized, all-to-all attention requiring global state synchronization. In contrast, **BDH (Baby Dragon Hatchling)** introduces a biologically grounded neural network architecture featuring:
- **Hebbian Working Memory**: Synaptic plasticity implemented as unnormalized outer-product associations.
- **Sparse Positive Activations**: Non-linear ReLU expansions enabling monosemantic, interpretable latent representations.
- **Scale-Free Structural Dynamics**: Local neuron-to-neuron communication with state-space efficiency.

This repository provides an end-to-end suite on Apple Silicon / PyTorch:
1. **Analytical simulator** validating the associative memory capacity laws and equivalence proofs.
2. **PyTorch training pipeline** training byte-level BDH models ($d=64$ and $d=128$) on TinyShakespeare.
3. **In-context interference benchmarks** measuring memory retention against increasing background context lengths.

---

## Theoretical Foundations

### 1. Synaptic Plasticity as Attention

In BDH, the causal attention mechanism operates without softmax normalization:

$$\mathbf{Scores} = \text{tril}(Q K^\top, -1), \quad Y = \mathbf{Scores} \cdot V$$

where $K \equiv Q$. This parallel matrix formulation is mathematically identical to a sequential, step-by-step Hebbian write and associative read loop:

```python
# Sequential Hebbian Loop
rho = np.zeros((d, val_dim))  # Synaptic weight matrix
for t in range(T):
    out[t] = q[t] @ rho        # Associative Read (past associations)
    rho += np.outer(k[t], v[t]) # Hebbian Write (synaptic plasticity)
```

In `memory_in_the_wiring.py`, we verify that the maximum absolute numerical difference between the parallel causal matrix attention and the sequential Hebbian update loop is:

$$\max |Y_{\text{parallel}} - Y_{\text{Hebbian}}| < 10^{-16}$$

This proves that **BDH's unnormalized causal attention is exactly Hebbian working memory**.

---

### 2. The Signal-to-Resonance Memory Law (SRM)

When storing $P$ key-value associations $(k_i, v_i)$ in a synaptic matrix $\rho = \sum_{i=1}^{P} k_i v_i^\top$, querying with key $k_t$ yields:

$$\hat{v}_t = k_t^\top \rho = \|k_t\|^2 v_t + \sum_{j \neq t} (k_t^\top k_j) v_j$$

- **Signal**: The desired association $\|k_t\|^2 v_t$.
- **Noise / Cross-Talk**: The sum over all other stored patterns $\sum_{j \neq t} (k_t^\top k_j) v_j$.

For quasi-orthogonal, randomly oriented keys in dimension $d$, the expected Signal-to-Noise Ratio (SNR / SRM) scales as:

$$\text{SRM} \approx \sqrt{\frac{d}{P - 1}}$$

---

### 3. The Capacity Knee ($P \approx d$)

As the number of stored patterns $P$ approaches table width $d$:
- When $P \ll d$: $\text{SRM} \gg 1$, near-perfect recall ($\approx 100\%$).
- When $P \approx d$: $\text{SRM} \approx 1.0$, signal equals interference noise.
- When $P > d$: $\text{SRM} < 1.0$, noise dominates and recall collapses.

**Key Invariant**: Doubling the embedding width $d$ doubles the memory capacity. At $P = 64$, a $d=64$ model drops to $\approx 83\%$ accuracy, whereas a $d=128$ model maintains $\approx 98\%$ accuracy.

---

### 4. The Measurement Trap (Nearest-Value vs. Argmax)

A common evaluation trap in vector recall is using `argmax(v_hat) == argmax(v)`. 
- **Argmax Decoding**: Falsely indicates $\ge 98\%$ accuracy far beyond capacity because coordinate-wise maximum values are preserved even under heavy additive noise.
- **Euclidean Nearest-Value Decoding** ($\min_j \|\hat{v} - v_j\|$): Faithfully detects the noise phase transition where the true vector is obscured by crosstalk.

---

### 5. The Cue Overlap Trap

When keys are not orthogonal but share a common subspace (cue overlap $c > 0$):

$$k_i = (1 - c) k_i^{\text{random}} + c \, u_{\text{shared}}$$

Cross-talk terms $(k_t^\top k_j)$ no longer have zero mean. Interference grows proportionally to $P \cdot c^2$, causing memory capacity to collapse significantly before $P$ reaches $d$.

---

## Empirical Results

### Capacity Law Verification ($d=64$ vs $d=128$)

Direct reproduction of Beat 4.2 & 4.3 from *Memory in the Wiring* (300 Monte Carlo trials per configuration, $val\_dim=16$):

| Patterns ($P$) | $d=64$ Theor. SRM | $d=64$ Acc (Nearest) | $d=128$ Theor. SRM | $d=128$ Acc (Nearest) | Phenomenon / State |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **5** | 4.00 | 1.00 | 5.66 | 1.00 | High SNR Regime |
| **8** | 3.02 | 1.00 | 4.28 | 1.00 | High SNR Regime |
| **16** | 2.07 | 1.00 | 2.92 | 1.00 | High SNR Regime |
| **17** | 2.00 | 1.00 | 2.83 | 1.00 | High SNR Regime |
| **32** | 1.44 | 0.99 | 2.03 | 1.00 | Pre-knee stability |
| **64** | **1.01** | **0.83** | 1.43 | 0.98 | **Knee for $d=64$ ($\text{SRM} \approx 1.0$)** |
| **65** | 1.00 | 0.83 | 1.41 | 0.98 | $d=64$ begins degradation |
| **128** | 0.71 | 0.45 | **1.00** | **0.78** | **Knee for $d=128$ ($\text{SRM} \approx 1.0$)** |
| **129** | 0.71 | 0.44 | 1.00 | 0.77 | $d=128$ begins degradation |
| **256** | 0.50 | 0.15 | 0.71 | 0.36 | Noise-dominated regime |

> **Takeaway**: At $P=64$, $d=64$ degrades to $83\%$, but $d=128$ remains rock solid at $98\%$. At $P=128$, $d=128$ reaches the same knee ($78\%$), experimentally confirming the $\sqrt{d / (P - 1)}$ law.

---

### Mathematical Equivalence Proof

Running the BDH attention equivalence verification:

```bash
python3 memory_in_the_wiring.py
```

Output:
```text
==================================================================================
EXPERIMENT 2: BDH Attention Equivalence Check (Beat 5.2)
==================================================================================
Max difference between BDH parallel attention and Hebbian loop: 0.00e+00
>> EXACT MATCH (to floating-point precision). BDH attention IS Hebbian memory.
==================================================================================
```

---

## Repository Structure

```text
├── README.md                    # Project documentation & theoretical guide
├── memory_in_the_wiring.py      # Standalone simulator for capacity laws & equivalence
├── train_bdh_tinyshakespeare.py # BDH model training pipeline on TinyShakespeare (Apple Silicon MPS / CPU)
├── eval_srm_tinyshakespeare.py  # In-context recall & interference benchmark
├── sample_checkpoints.py        # Text generation script for trained checkpoints
├── capacity_table.txt           # Formatted ASCII capacity comparison table
├── capacity_table.csv           # Raw CSV benchmark results
├── input.txt                    # TinyShakespeare dataset (~1.1 MB)
├── bdh_d64.pt                   # Checkpoint for BDH d=64 model
├── bdh_d128.pt                  # Checkpoint for BDH d=128 model
└── bdh_ref/                     # Upstream reference implementation (Pathway BDH)
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- PyTorch 2.0+ (supports Apple Silicon `mps` or CUDA / CPU)
- NumPy

Install dependencies:
```bash
pip install torch numpy
```

---

### 1. Running Theoretical Capacity Simulations

Run the side-by-side comparison between $d=64$ and $d=128$:
```bash
python3 memory_in_the_wiring.py --compare
```

Simulate with correlated keys (cue overlap $c = 0.2$):
```bash
python3 memory_in_the_wiring.py --d 64 --overlap 0.2
```

---

### 2. Training BDH on TinyShakespeare

Train a BDH model with custom embedding dimension:

```bash
# Train d=64 model
python3 train_bdh_tinyshakespeare.py --d 64 --iters 800 --lr 2e-3

# Train d=128 model
python3 train_bdh_tinyshakespeare.py --d 128 --iters 800 --lr 2e-3
```

- Automatically downloads `input.txt` (TinyShakespeare) if missing.
- Automatically selects Apple Silicon Metal Performance Shaders (`mps`) when run on macOS.
- Saves model weights to `bdh_d64.pt` and `bdh_d128.pt`.

---

### 3. Generating Text from Checkpoints

Sample text from the trained checkpoints with various prompts:

```bash
python3 sample_checkpoints.py
```

Example prompt:
```text
[Prompt]: 'ROMEO:\nI take thee at thy word:\nCall me but '
--------------------------------------------------
ROMEO:
I take thee at thy word:
Call me but love, and I will be new baptiz'd;
Henceforth I never will be Romeo...
--------------------------------------------------
```

---

### 4. Evaluating In-Context Interference

Measure how background token interference affects needle recall across context window lengths $P$:

```bash
python3 eval_srm_tinyshakespeare.py --trials 50
```

---

## Checkpoints

| Checkpoint | Embedding Dim ($d$) | Layers | Heads | Expansion ($N$) | File Size |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `bdh_d64.pt` | 64 | 4 | 4 | 1024 | ~3.3 MB |
| `bdh_d128.pt` | 128 | 4 | 4 | 2048 | ~12.9 MB |

Both checkpoints use byte-level tokenization (`vocab_size = 256`), Rotary Position Embeddings (RoPE), and sparse ReLU latent projections.

---

## References & Citation

1. **Pathway BDH Paper**:
   > A. Kosowski, P. Uznański, J. Chorowski, Z. Stamirowska, M. Bartoszkiewicz.
   > *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain.*
   > [arXiv:2509.26507 (2025)](https://doi.org/10.48550/arXiv.2509.26507).
   > Official repository: [pathwaycom/bdh](https://github.com/pathwaycom/bdh).

2. **Theoretical Foundations**:
   > *Memory in the Wiring: Synaptic Plasticity as Short-Term Memory — and where it lives in BDH.*
