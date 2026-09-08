"""Verifies mathematical equivalence between BDH parallel causal attention and sequential Hebbian updates."""

import numpy as np
np.seterr(all="ignore")


def verify_bdh_attention_equivalence(T: int = 16, d: int = 32):
    k = np.random.randn(T, d) / np.sqrt(d)
    q = k
    v = np.random.randn(T, d) / np.sqrt(d)

    scores = np.tril(q @ k.T, k=-1)
    bdh_out = scores @ v

    loop_out = np.zeros((T, d))
    rho = np.zeros((d, d))
    for t in range(T):
        loop_out[t] = q[t] @ rho
        rho += np.outer(k[t], v[t])

    max_diff = np.max(np.abs(bdh_out - loop_out))
    return max_diff


if __name__ == "__main__":
    diff = verify_bdh_attention_equivalence()
    print(f"Max difference between parallel BDH attention and sequential Hebbian loop: {diff:.2e}")
    assert diff < 1e-12, "Attention output does not match Hebbian loop"
    print("Exact match: BDH unnormalized causal attention is mathematically identical to Hebbian synaptic plasticity.")
