import os
import sys
import math
from pathlib import Path
import numpy as np
import torch
import matplotlib.pyplot as plt

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from train_bdh_tinyshakespeare import BDH, BDHConfig

torch.manual_seed(42)
np.random.seed(42)

CONTEXT_LENGTHS = [10, 31, 51, 72, 93, 114, 134, 155, 176, 196, 217, 238, 259, 279, 300]


def get_checkpoint_model(checkpoint_path="bdh_d128.pt"):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}")

    chk = torch.load(checkpoint_path, map_location=device, weights_only=False)
    config = chk["config"]
    model = BDH(config).to(device)
    model.load_state_dict(chk["model_state"])
    model.eval()
    return model, device


def load_corpus(path="input.txt"):
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    return b"To be, or not to be, that is the question. Fair is foul, and foul is fair." * 1000


def get_condition_tokens(cond: str, t: int, corpus: bytes, device: torch.device):
    if cond == "C=0":
        return torch.randint(0, 256, (1, t), device=device)
    elif cond == "C=2":
        start = np.random.randint(0, len(corpus) - t - 1)
        return torch.tensor(list(corpus[start : start + t]), dtype=torch.long, device=device).unsqueeze(0)
    elif cond == "C=8":
        topic_chars = [ord(c) for c in "romeo juliet king lord queen "]
        seq = np.random.choice(topic_chars, size=t)
        return torch.tensor(seq, dtype=torch.long, device=device).unsqueeze(0)
    raise ValueError(f"Unknown condition {cond}")


def evaluate_checkpoint_memory(model, device, corpus, trials_per_t: int = 15):
    conditions = ["C=0", "C=2", "C=8"]
    results = {cond: {"t": CONTEXT_LENGTHS, "acc": [], "err": []} for cond in conditions}

    print(f"Evaluating {model.config.n_embd}-dim checkpoint on {device}...")

    for cond in conditions:
        print(f"Running condition: {cond}")
        for t in CONTEXT_LENGTHS:
            acc_list = []
            err_list = []

            for _ in range(trials_per_t):
                tokens = get_condition_tokens(cond, t, corpus, device)

                with torch.no_grad():
                    x = model.embed(tokens).unsqueeze(1)
                    x = model.ln(x)

                    x_latent = x @ model.encoder
                    x_sparse = torch.relu(x_latent)

                    r_phases = (
                        torch.arange(0, t, device=model.attn.freqs.device, dtype=model.attn.freqs.dtype).view(1, 1, -1, 1)
                    ) * model.attn.freqs
                    QR = model.attn.rope(r_phases, x_sparse)

                    h = 0
                    K = QR[0, h]
                    V = x[0, 0]

                    rho = K.T @ V
                    A_star = K @ rho

                    num_queries = max(1, t - 1)
                    for q in range(num_queries):
                        self_gain = torch.dot(K[q], K[q]).item()
                        a_star_q = A_star[q] / (self_gain + 1e-9)
                        v_q = V[q]

                        dists = torch.norm(V - a_star_q, dim=-1)
                        acc_list.append(1.0 if torch.argmin(dists).item() == q else 0.0)

                        l2_err = float(torch.norm(a_star_q - v_q).item() / (torch.norm(v_q).item() + 1e-9))
                        err_list.append(l2_err)

            mean_acc = float(np.mean(acc_list))
            mean_err = float(np.mean(err_list))
            results[cond]["acc"].append(mean_acc)
            results[cond]["err"].append(mean_err)
            print(f"  {cond} | t={t:3d}: Acc = {mean_acc:6.3f} | L2 Err = {mean_err:6.3f}")

    return results


def plot_checkpoint_results(results, output_path="checkpoint_correlation_recall_collapse.png"):
    plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Helvetica", "Arial", "Liberation Sans"]
    plt.rcParams["axes.edgecolor"] = "#d0d0d0"
    plt.rcParams["axes.linewidth"] = 1.0

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6), dpi=300)

    meta = {
        "C=0": {"label": "Independent (C=0)", "color": "#0277bd"},
        "C=2": {"label": "Correlated (C=2)", "color": "#d97706"},
        "C=8": {"label": "Correlated (C=8)", "color": "#009688"},
    }

    for ax in (ax1, ax2):
        ax.set_facecolor("#fafafa")
        ax.grid(True, linestyle="-", color="#e8e8e8", linewidth=1.0, zorder=0)
        ax.set_axisbelow(True)
        ax.set_xlim(-5, 310)
        ax.set_xticks([0, 50, 100, 150, 200, 250, 300])
        ax.tick_params(colors="#333333", labelsize=10, width=1.0, length=4)
        for spine in ax.spines.values():
            spine.set_color("#cccccc")

    # Left: Recall Accuracy
    ax1.set_title("Nearest-Value Recall Accuracy vs Context Length (Trained Checkpoint)", fontsize=11, fontweight="bold", pad=12, color="#111111")
    ax1.set_xlabel("Context Length (t)", fontsize=10, color="#222222", labelpad=8)
    ax1.set_ylabel("Recall Accuracy (Nearest-Value)", fontsize=10, color="#222222", labelpad=8)
    ax1.set_ylim(-0.05, 1.05)
    ax1.set_yticks([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])

    for cond in ["C=0", "C=2", "C=8"]:
        ax1.plot(
            CONTEXT_LENGTHS,
            results[cond]["acc"],
            color=meta[cond]["color"],
            linestyle="-",
            linewidth=2.0,
            marker="o",
            markersize=5.5,
            label=meta[cond]["label"],
            zorder=3
        )

    ax1.axvline(x=128, color="#888888", linestyle="--", linewidth=1.2, label="Neuron Count (n=128)", zorder=2)
    ax1.axvline(x=32, color="#aaaaaa", linestyle=":", linewidth=1.2, label="Bottleneck (d=32)", zorder=2)

    ax1.legend(loc="upper right", fontsize=9, frameon=True, facecolor="#ffffff", edgecolor="#dddddd", framealpha=0.9)

    # Right: L2 Retrieval Error
    ax2.set_title("Average L2 Retrieval Error vs Context Length (Trained Checkpoint)", fontsize=11, fontweight="bold", pad=12, color="#111111")
    ax2.set_xlabel("Context Length (t)", fontsize=10, color="#222222", labelpad=8)
    ax2.set_ylabel("L2 Retrieval Error (Normalized)", fontsize=10, color="#222222", labelpad=8)
    ax2.set_ylim(0.30, 4.50)

    for cond in ["C=0", "C=2", "C=8"]:
        ax2.plot(
            CONTEXT_LENGTHS,
            results[cond]["err"],
            color=meta[cond]["color"],
            linestyle="--",
            linewidth=2.0,
            marker="s",
            markersize=5.0,
            label=meta[cond]["label"],
            zorder=3
        )

    ax2.axvline(x=128, color="#888888", linestyle="--", linewidth=1.2, zorder=2)
    ax2.axvline(x=32, color="#aaaaaa", linestyle=":", linewidth=1.2, zorder=2)

    ax2.legend(loc="upper left", fontsize=9, frameon=True, facecolor="#ffffff", edgecolor="#dddddd", framealpha=0.9)

    fig.suptitle(
        "Key Correlation (C) Accelerates Recall Collapse as Context (t) Exceeds Dimension (n)",
        fontsize=13,
        fontweight="bold",
        y=1.02,
        color="#111111"
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Saved plot to {output_path}")


if __name__ == "__main__":
    ckpt_path = str(ROOT_DIR / "bdh_d128.pt")
    corpus_path = str(ROOT_DIR / "input.txt")
    output_png = str(ROOT_DIR / "results" / "checkpoint_correlation_recall_collapse.png")

    model, device = get_checkpoint_model(ckpt_path)
    corpus = load_corpus(corpus_path)
    results = evaluate_checkpoint_memory(model, device, corpus, trials_per_t=12)
    plot_checkpoint_results(results, output_path=output_png)
