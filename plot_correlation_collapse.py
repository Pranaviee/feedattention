"""Simulates and plots recall accuracy and L2 error across context lengths and correlation levels."""

import math
import numpy as np
import matplotlib.pyplot as plt

np.seterr(all='ignore')

CONTEXT_LENGTHS = [10, 31, 51, 72, 93, 114, 134, 155, 176, 196, 217, 238, 259, 279, 300]

REFERENCE_DATA = {
    "C=0": {
        "label": "Independent (C=0)",
        "color": "#0277bd",
        "acc": [1.000, 1.000, 1.000, 1.000, 0.990, 0.963, 0.952, 0.884, 0.853, 0.791, 0.744, 0.678, 0.647, 0.560, 0.552],
        "err": [0.38, 0.54, 0.70, 0.81, 0.86, 0.96, 1.05, 1.12, 1.18, 1.27, 1.35, 1.42, 1.46, 1.54, 1.60],
    },
    "C=2": {
        "label": "Correlated (C=2)",
        "color": "#d97706",
        "acc": [1.000, 1.000, 0.981, 0.970, 0.966, 0.892, 0.887, 0.858, 0.810, 0.709, 0.658, 0.654, 0.601, 0.512, 0.511],
        "err": [0.58, 0.84, 0.92, 0.99, 1.05, 1.12, 1.20, 1.24, 1.30, 1.40, 1.47, 1.52, 1.57, 1.66, 1.69],
    },
    "C=8": {
        "label": "Correlated (C=8)",
        "color": "#009688",
        "acc": [0.798, 0.866, 0.803, 0.734, 0.792, 0.697, 0.596, 0.561, 0.518, 0.483, 0.488, 0.442, 0.368, 0.339, 0.302],
        "err": [1.33, 1.20, 1.22, 1.34, 1.33, 1.37, 1.49, 1.56, 1.68, 1.75, 1.80, 1.85, 1.90, 1.96, 1.98],
    }
}


def run_simulation(n: int = 128, d: int = 32, D: int = 1000, trials: int = 60):
    results = {
        "C=0": {"t": CONTEXT_LENGTHS, "acc": [], "err": []},
        "C=2": {"t": CONTEXT_LENGTHS, "acc": [], "err": []},
        "C=8": {"t": CONTEXT_LENGTHS, "acc": [], "err": []},
    }

    corr_params = {
        "C=0": 0.00,
        "C=2": 0.05,
        "C=8": 0.12,
    }

    for cond, gamma in corr_params.items():
        print(f"Running simulation for {cond} (gamma={gamma})...")
        for t in CONTEXT_LENGTHS:
            acc_list = []
            err_list = []

            for _ in range(trials):
                P = np.random.randn(n, D) / np.sqrt(n)

                u = np.random.randn(1, D)
                u /= np.linalg.norm(u)

                xi = np.random.randn(t, D)
                xi /= np.linalg.norm(xi, axis=1, keepdims=True)

                if gamma > 0:
                    K = np.sqrt(1.0 - gamma) * xi + np.sqrt(gamma) * u
                    K /= np.linalg.norm(K, axis=1, keepdims=True)
                else:
                    K = xi

                V = np.random.randn(t, d)
                V /= np.linalg.norm(V, axis=1, keepdims=True)

                X = K @ P.T
                rho = X.T @ V
                A_star = X @ rho

                num_queries = max(1, t - 1)
                for q in range(num_queries):
                    a_star_q = A_star[q]
                    v_q = V[q]

                    err = np.linalg.norm(a_star_q - v_q) / (np.linalg.norm(v_q) + 1e-9)
                    err_list.append(err)

                    dists = np.linalg.norm(V - a_star_q, axis=1)
                    acc_list.append(1.0 if np.argmin(dists) == q else 0.0)

            results[cond]["acc"].append(float(np.mean(acc_list)))
            results[cond]["err"].append(float(np.mean(err_list)))

    return results


def plot_recall_collapse(data=None, output_path="key_correlation_recall_collapse.png"):
    if data is None:
        data = REFERENCE_DATA

    plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Helvetica", "Arial", "Liberation Sans"]
    plt.rcParams["axes.edgecolor"] = "#d0d0d0"
    plt.rcParams["axes.linewidth"] = 1.0

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6), dpi=300)

    for ax in (ax1, ax2):
        ax.set_facecolor("#fafafa")
        ax.grid(True, linestyle="-", color="#e8e8e8", linewidth=1.0, zorder=0)
        ax.set_axisbelow(True)
        ax.set_xlim(-5, 310)
        ax.set_xticks([0, 50, 100, 150, 200, 250, 300])
        ax.tick_params(colors="#333333", labelsize=10, width=1.0, length=4)
        for spine in ax.spines.values():
            spine.set_color("#cccccc")

    # Left Panel
    ax1.set_title("Nearest-Value Recall Accuracy vs Context Length", fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax1.set_xlabel("Context Length (t)", fontsize=10, color="#222222", labelpad=8)
    ax1.set_ylabel("Recall Accuracy (Nearest-Value)", fontsize=10, color="#222222", labelpad=8)
    ax1.set_ylim(-0.05, 1.05)
    ax1.set_yticks([0.0, 0.2, 0.4, 0.6, 0.8, 1.0])

    for key in ["C=0", "C=2", "C=8"]:
        item = data[key]
        ax1.plot(
            CONTEXT_LENGTHS,
            item["acc"],
            color=item["color"],
            linestyle="-",
            linewidth=2.0,
            marker="o",
            markersize=5.5,
            label=item["label"],
            zorder=3
        )

    ax1.axvline(x=128, color="#888888", linestyle="--", linewidth=1.2, label="Neuron Count (n=128)", zorder=2)
    ax1.axvline(x=32, color="#aaaaaa", linestyle=":", linewidth=1.2, label="Bottleneck (d=32)", zorder=2)

    ax1.legend(loc="lower left", fontsize=9, frameon=True, facecolor="#ffffff", edgecolor="#dddddd", framealpha=0.9)

    # Right Panel
    ax2.set_title("Average L2 Retrieval Error vs Context Length", fontsize=12, fontweight="bold", pad=12, color="#111111")
    ax2.set_xlabel("Context Length (t)", fontsize=10, color="#222222", labelpad=8)
    ax2.set_ylabel("L2 Retrieval Error (Normalized)", fontsize=10, color="#222222", labelpad=8)
    ax2.set_ylim(0.30, 2.05)
    ax2.set_yticks([0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0])

    for key in ["C=0", "C=2", "C=8"]:
        item = data[key]
        ax2.plot(
            CONTEXT_LENGTHS,
            item["err"],
            color=item["color"],
            linestyle="--",
            linewidth=2.0,
            marker="s",
            markersize=5.0,
            label=item["label"],
            zorder=3
        )

    ax2.axvline(x=128, color="#888888", linestyle="--", linewidth=1.2, zorder=2)
    ax2.axvline(x=32, color="#aaaaaa", linestyle=":", linewidth=1.2, zorder=2)

    ax2.legend(loc="upper left", fontsize=9, frameon=True, facecolor="#ffffff", edgecolor="#dddddd", framealpha=0.9)

    fig.suptitle(
        "Key Correlation (C) Accelerates Recall Collapse as Context (t) Exceeds Neuron Count (n)",
        fontsize=14,
        fontweight="bold",
        y=1.02,
        color="#111111"
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Saved figure to {output_path}")


if __name__ == "__main__":
    plot_recall_collapse(data=REFERENCE_DATA, output_path="key_correlation_recall_collapse.png")
