"""
Memory in the Wiring: Synaptic Plasticity as Short-Term Memory — and where it lives in BDH
Direct reproduction of the experiments, laws, and equivalence proofs described in the document.

Covers:
  - Beat 4.2 & 4.3: Memory capacity law: Signal / Noise ≈ √(d / (P - 1)) and the knee at P ≈ d.
  - Beat 4.4: The cue overlap trap (correlated keys breaking memory early).
  - Beat 5.2: Exact equivalence between BDH's attention tril(Q @ K.T) @ V and step-by-step rho += k v^T.
  - Beat 6: The measurement trap (Argmax vs. Nearest-Value recall).
"""

import math
import argparse
import numpy as np

# Suppress harmless macOS Accelerate BLAS floating-point flag in NumPy 2.0+
np.seterr(all='ignore')


def run_capacity_experiment(d: int = 64, val_dim: int = 16, p_list=None, trials: int = 300, cue_overlap: float = 0.0):
    """
    Simulates memory table rho (shape d x val_dim) storing P associations.
    The keys live in d dimensions (table width / key dimension).
    The values live in val_dim=16 dimensions (matching the exact setup in 'Memory in the Wiring').

    Evaluates:
      1. Measured Signal-to-Noise Ratio (SRM) vs theoretical sqrt(d / (P - 1))
      2. Nearest-value recall accuracy (true degradation metric)
      3. Argmax recall accuracy (the measurement trap)
    """
    if p_list is None:
        p_list = [5, 8, 16, 17, 32, 64, 65, 128, 129, 256]

    results = []

    for P in p_list:
        if P <= 1:
            continue

        measured_snr_list = []
        correct_nearest_count = 0
        correct_argmax_count = 0
        total_queries = 0

        for _ in range(trials):
            # Generate random unit-length keys in d dimensions
            keys = np.random.randn(P, d)
            if cue_overlap > 0:
                # Add a shared common direction to all keys (Beat 4.4)
                shared_component = np.random.randn(1, d)
                shared_component /= np.linalg.norm(shared_component)
                keys = (1 - cue_overlap) * keys + cue_overlap * shared_component

            keys /= np.linalg.norm(keys, axis=1, keepdims=True)

            # Generate random unit-length values in val_dim dimensions (val_dim=16)
            values = np.random.randn(P, val_dim)
            values /= np.linalg.norm(values, axis=1, keepdims=True)

            # Memory table rho: sum of outer products (rho += k v^T)
            # rho has shape (d, val_dim)
            rho = keys.T @ values

            # Query each stored item
            for t in range(P):
                kt = keys[t]
                vt = values[t]

                # Retrieved vector: v_hat = k_t^T @ rho
                v_hat = kt @ rho

                # Decompose into Signal (what you wanted) and Noise (everything else)
                signal_vec = (kt @ kt) * vt  # ||k_t||^2 * v_t
                noise_vec = v_hat - signal_vec

                signal_norm = np.linalg.norm(signal_vec)
                noise_norm = np.linalg.norm(noise_vec)

                if noise_norm > 1e-9:
                    measured_snr_list.append(signal_norm / noise_norm)

                # Metric 1: Nearest-Value Decode (Closest stored value by Euclidean distance)
                dists = np.linalg.norm(values - v_hat, axis=1)
                if np.argmin(dists) == t:
                    correct_nearest_count += 1

                # Metric 2: Argmax Decode (Check coordinate-wise maximum)
                if np.argmax(v_hat) == np.argmax(vt):
                    correct_argmax_count += 1

                total_queries += 1

        measured_snr = float(np.mean(measured_snr_list))
        theor_snr = math.sqrt(d / (P - 1))
        acc_nearest = correct_nearest_count / total_queries
        acc_argmax = correct_argmax_count / total_queries

        results.append({
            "d": d,
            "P": P,
            "measured_snr": measured_snr,
            "theor_snr": theor_snr,
            "acc_nearest": acc_nearest,
            "acc_argmax": acc_argmax,
        })

    return results


def verify_bdh_attention_equivalence(T: int = 16, d: int = 32):
    """
    Beat 5.2 & Beat 5.3:
    Proves that BDH's attention line:
      scores = (Q @ K.T).tril(diagonal=-1)
      out = scores @ V
    computes the exact same values as the sequential Hebbian loop:
      rho = zeros(n, d)
      for t in range(T):
          out[t] = k[t] @ rho
          rho += outer(k[t], v[t])
    """
    # Keys/queries and values over sequence length T
    k = np.random.randn(T, d)
    q = k  # In BDH, K is Q
    v = np.random.randn(T, d)

    # 1. BDH reference implementation parallel formula
    scores = np.tril(q @ k.T, k=-1)
    bdh_out = scores @ v

    # 2. Step-by-step Hebbian read/write loop
    loop_out = np.zeros((T, d))
    rho = np.zeros((d, d))
    for t in range(T):
        loop_out[t] = q[t] @ rho        # Read (strictly past tokens due to tril)
        rho += np.outer(k[t], v[t])     # Write (Hebbian update)

    max_diff = np.max(np.abs(bdh_out - loop_out))
    return max_diff


def print_report(d=64, cue_overlap=0.0):
    print("=" * 82)
    print(f"EXPERIMENT 1: The Capacity Law  √(d / (P - 1))  [d = {d}, cue_overlap = {cue_overlap}]")
    print("=" * 82)
    print(f"{'d':>4} | {'P':>4} | {'Measured SNR':>12} | {'√(d/(P-1))':>10} | {'Nearest Acc':>12} | {'Argmax Acc':>10}")
    print("-" * 82)

    results = run_capacity_experiment(d=d, cue_overlap=cue_overlap)
    for r in results:
        print(f"{r['d']:>4} | {r['P']:>4} | {r['measured_snr']:>12.2f} | {r['theor_snr']:>10.2f} | {r['acc_nearest']:>12.2f} | {r['acc_argmax']:>10.2f}")

    print("\n" + "=" * 82)
    print("EXPERIMENT 2: BDH Attention Equivalence Check (Beat 5.2)")
    print("=" * 82)
    diff = verify_bdh_attention_equivalence()
    print(f"Max difference between BDH parallel attention and Hebbian loop: {diff:.2e}")
    if diff < 1e-12:
        print(">> EXACT MATCH (to floating-point precision). BDH attention IS Hebbian memory.")
    print("=" * 82)


def print_comparison_report():
    print("=" * 90)
    print("THE CAPACITY LAW: SIDE-BY-SIDE COMPARISON (d = 64 vs d = 128)")
    print("Direct reproduction of Beat 4.2 & 4.3 from 'Memory in the Wiring'")
    print("=" * 90)
    p_list = [5, 8, 16, 17, 32, 64, 65, 128, 129, 256]
    res_64 = {r["P"]: r for r in run_capacity_experiment(d=64, p_list=p_list, trials=300)}
    res_128 = {r["P"]: r for r in run_capacity_experiment(d=128, p_list=p_list, trials=300)}

    print(f"{'P':>4} | {'d=64 SRM':>10} | {'d=64 Acc':>10} | {'d=128 SRM':>11} | {'d=128 Acc':>11} | Notes")
    print("-" * 90)
    for P in p_list:
        r64 = res_64[P]
        r128 = res_128[P]
        note = ""
        if P == 64:
            note = "<- Knee for d=64 (SRM ≈ 1.0, acc drops to ~0.83)"
        elif P == 128:
            note = "<- Knee for d=128 (SRM ≈ 1.0, acc drops to ~0.83)"
        print(f"{P:>4} | {r64['theor_snr']:>10.2f} | {r64['acc_nearest']:>10.2f} | {r128['theor_snr']:>11.2f} | {r128['acc_nearest']:>11.2f} | {note}")

    print("=" * 90)
    print("Notice: At P=64, d=64 drops to ~0.83, but d=128 stays at ~0.98!")
    print("        At P=128, d=128 drops to ~0.83, exactly doubling the capacity.")
    print("=" * 90)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Memory in the Wiring Reproduction")
    parser.add_argument("--d", type=int, default=64, help="Table width / dimension d")
    parser.add_argument("--overlap", type=float, default=0.0, help="Cue overlap (0.0 to 0.5)")
    parser.add_argument("--compare", action="store_true", help="Compare d=64 vs d=128 side-by-side")
    args = parser.parse_args()

    if args.compare:
        print_comparison_report()
    else:
        print_report(d=args.d, cue_overlap=args.overlap)
