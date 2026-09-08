# BDH In-Context Recall Collapse: Checkpoint Evaluation Report

## 1. Architectural Dimensions Considered

All empirical metrics in this report were measured directly on the trained **Baby Dragon Hatchling (BDH)** checkpoint [`bdh_d128.pt`](file:///Users/pranavi/Desktop/projects/dataforge/bdh_d128.pt) without synthetic Gaussian approximations.

| Parameter | Symbol | Checkpoint Value | Description |
| :--- | :---: | :---: | :--- |
| **Bottleneck Dimension** | $d$ | **128** | The low-rank token embedding and value representation dimension (`config.n_embd = 128`). Each stored value vector lives in $V \in \mathbb{R}^{d}$. |
| **Latent Neuron Dimension** | $n$ | **2048** | Active sparse neuron representation dimension per attention head (`N = d * 64 // nh = 2048`). Each key lives in $K \in \mathbb{R}^{n}$. Across all 4 heads, the total latent neuron count is **8,192**. |
| **Attention Heads** | $nh$ | **4** | Number of parallel associative attention heads (`config.n_head = 4`). |
| **Model Layers** | $L$ | **4** | Causal synaptic layers (`config.n_layer = 4`). |
| **Vocabulary Size** | $V_{\text{size}}$ | **256** | Byte-level ASCII vocabulary. |
| **Synaptic Memory Table** | $\rho_t$ | **$2048 \times 128$** | Matrix of accumulated outer-product associations per head: $\rho_t = \sum_{\tau < t} K_\tau V_\tau^\top$. |

---

## 2. Experimental Data Table

Metrics evaluated across 15 sequence lengths $t \in [10, 300]$ under three controlled correlation conditions:
* **Independent ($C=0$)**: Random uniformly sampled byte tokens from the 256-vocabulary (near-orthogonal neuron firing).
* **Correlated ($C=2$)**: Coherent natural English text from `input.txt` (TinyShakespeare corpus with natural language co-occurrence).
* **Highly Correlated ($C=8$)**: High topic repetition / cue overlap (concentrated subset of frequent character words like `"romeo juliet king lord queen"`).

| Context Length ($t$) | $C=0$ (Independent)<br>Recall Accuracy | $C=0$ (Independent)<br>L2 Retrieval Error | $C=2$ (Natural Text)<br>Recall Accuracy | $C=2$ (Natural Text)<br>L2 Retrieval Error | $C=8$ (Topic Repetitive)<br>Recall Accuracy | $C=8$ (Topic Repetitive)<br>L2 Retrieval Error |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **10** | **0.981** (98.1%) | 0.822 | **0.833** (83.3%) | 0.831 | **0.694** (69.4%) | 0.957 |
| **31** | **0.900** (90.0%) | 1.327 | **0.506** (50.6%) | 1.043 | **0.389** (38.9%) | 1.225 |
| **51** | **0.775** (77.5%) | 1.665 | **0.412** (41.2%) | 1.116 | **0.257** (25.7%) | 1.496 |
| **72** | **0.786** (78.6%) | 1.742 | **0.344** (34.4%) | 1.293 | **0.192** (19.2%) | 1.814 |
| **93** | **0.718** (71.8%) | 1.979 | **0.274** (27.4%) | 1.447 | **0.148** (14.8%) | 1.947 |
| **114** | **0.638** (63.8%) | 2.222 | **0.230** (23.0%) | 1.454 | **0.124** (12.4%) | 2.149 |
| **134** | **0.646** (64.6%) | 2.361 | **0.205** (20.5%) | 1.548 | **0.106** (10.6%) | 2.377 |
| **155** | **0.616** (61.6%) | 2.531 | **0.172** (17.2%) | 1.671 | **0.091** (9.1%) | 2.667 |
| **176** | **0.565** (56.5%) | 2.704 | **0.155** (15.5%) | 1.803 | **0.084** (8.4%) | 2.808 |
| **196** | **0.546** (54.6%) | 2.808 | **0.140** (14.0%) | 1.825 | **0.072** (7.2%) | 3.009 |
| **217** | **0.493** (49.3%) | 2.935 | **0.135** (13.5%) | 2.048 | **0.067** (6.7%) | 3.239 |
| **238** | **0.493** (49.3%) | 3.202 | **0.121** (12.1%) | 2.149 | **0.060** (6.0%) | 3.445 |
| **259** | **0.469** (46.9%) | 3.370 | **0.106** (10.6%) | 2.323 | **0.056** (5.6%) | 3.729 |
| **279** | **0.451** (45.1%) | 3.438 | **0.098** (9.8%) | 2.373 | **0.051** (5.1%) | 3.827 |
| **300** | **0.440** (44.0%) | 3.513 | **0.094** (9.4%) | 2.601 | **0.048** (4.8%) | 4.106 |

---

## 3. How the Metrics Were Computed from Checkpoint Tensors

1. **Activation Generation**:
   A prompt of length $t$ is passed through the trained checkpoint:
   $$x = \text{LayerNorm}(\text{Embed}(\text{tokens})) \in \mathbb{R}^{1 \times 1 \times t \times 128}$$
   $$x_{\text{sparse}} = \text{ReLU}(x \cdot W_{\text{encoder}}) \in \mathbb{R}^{1 \times 4 \times t \times 2048}$$
   $$K = \text{RoPE}(x_{\text{sparse}})[0, \text{head}_0] \in \mathbb{R}^{t \times 2048}, \quad V = x[0, 0] \in \mathbb{R}^{t \times 128}$$

2. **Synaptic Memory Accumulation**:
   $$\rho_t = K^\top V \in \mathbb{R}^{2048 \times 128}$$

3. **Associative Readout at Historical Query $q < t$**:
   $$a^*_q = \frac{K_q \rho_t}{\|K_q\|^2 + \epsilon} \in \mathbb{R}^{128}$$

4. **Nearest-Neighbor Accuracy**:
   $$\arg\min_{j < t} \|a^*_q - V_j\|_2 == q$$

5. **Normalized $L_2$ Retrieval Error**:
   $$\text{Error} = \frac{\|a^*_q - V_q\|_2}{\|V_q\|_2 + \epsilon}$$

---

## 4. Associated Artifacts

* **CSV Spreadsheet**: [`checkpoint_recall_collapse_data.csv`](checkpoint_recall_collapse_data.csv)
* **High-Resolution Figure**: [`checkpoint_correlation_recall_collapse.png`](checkpoint_correlation_recall_collapse.png)
* **Execution Script**: [`eval_checkpoint_correlation_graph.py`](../tests/eval_checkpoint_correlation_graph.py)
