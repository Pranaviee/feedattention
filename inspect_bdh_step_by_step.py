"""Inspects intermediate tensor states, sparsity, and Hebbian memory across BDH layers."""

import os
import argparse
import torch
import torch.nn.functional as F
from train_bdh_tinyshakespeare import BDH, BDHConfig


def print_summary(name: str, tensor: torch.Tensor):
    t = tensor.detach().cpu().float()
    mean = t.mean().item()
    norm = t.norm().item()
    min_v = t.min().item()
    max_v = t.max().item()
    sparsity = (t == 0).float().mean().item() * 100
    print(f"  {name:<16} | Shape: {str(list(t.shape)):<16} | Norm: {norm:>7.2f} | Range: [{min_v:5.2f}, {max_v:5.2f}] | Sparsity: {sparsity:>4.1f}%")


def inspect_inference(prompt: str = "paris", checkpoint: str = "bdh_d64.pt", interactive: bool = False):
    device = torch.device("cpu")
    print(f"Inspecting BDH model on prompt: {repr(prompt)}")

    if os.path.exists(checkpoint):
        chk = torch.load(checkpoint, map_location=device, weights_only=False)
        config = chk["config"]
        model = BDH(config).to(device)
        model.load_state_dict(chk["model_state"])
        print(f"Loaded checkpoint '{checkpoint}' (d={config.n_embd}, layers={config.n_layer}, heads={config.n_head})")
    else:
        print(f"Checkpoint '{checkpoint}' not found, initializing fresh model.")
        config = BDHConfig(n_layer=4, n_embd=64, n_head=4, mlp_internal_dim_multiplier=64)
        model = BDH(config).to(device)
    model.eval()

    # Tokenization
    tokens = list(prompt.encode("utf-8"))
    chars = [chr(t) for t in tokens]
    T = len(tokens)
    print(f"Tokens: {tokens} ({chars}), Length: {T}")

    idx = torch.tensor([tokens], dtype=torch.long, device=device)

    with torch.no_grad():
        x = model.ln(model.embed(idx).unsqueeze(1))
        print_summary("Embedding (normed)", x)

        C = model.config
        nh = C.n_head
        D = C.n_embd
        N = D * C.mlp_internal_dim_multiplier // nh

        # Layer 0
        print("\nLayer 0:")
        x_latent = x @ model.encoder
        x_sparse = F.relu(x_latent)
        print_summary("x_latent", x_latent)
        print_summary("x_sparse (ReLU)", x_sparse)

        active = (x_sparse > 0).sum(dim=-1).float().mean().item()
        print(f"  Active neurons/head: {active:.1f}/{N} ({active/N*100:.1f}%)")

        r_phases = (
            torch.arange(0, T, device=model.attn.freqs.device, dtype=model.attn.freqs.dtype).view(1, 1, -1, 1)
        ) * model.attn.freqs
        QR = model.attn.rope(r_phases, x_sparse)
        scores = (QR @ QR.mT).tril(diagonal=-1)
        print_summary("QR (RoPE)", QR)
        print_summary("Attention scores", scores)

        # Sequential Hebbian check
        q_t = QR[0, 0]
        v_t = x[0, 0]
        rho = torch.zeros((N, D), dtype=torch.float32)
        seq_out = torch.zeros((T, D), dtype=torch.float32)
        for t in range(T):
            seq_out[t] = q_t[t] @ rho
            rho += torch.outer(q_t[t], v_t[t])

        yKV = scores @ x
        diff = (yKV[0, 0] - seq_out).abs().max().item()
        print(f"  Parallel vs Hebbian diff: {diff:.2e}")

        # Gating & decoder
        yKV_normed = model.ln(yKV)
        y_sparse = F.relu(yKV_normed @ model.encoder_v)
        xy_sparse = x_sparse * y_sparse
        yMLP = xy_sparse.transpose(1, 2).reshape(1, 1, T, N * nh) @ model.decoder
        print_summary("xy_sparse (gated)", xy_sparse)
        print_summary("Decoder out", yMLP)

        # Layer progression
        cur_x = x
        print("\nLayer-by-layer:")
        for level in range(C.n_layer):
            x_prev = cur_x
            x_sp = F.relu(cur_x @ model.encoder)
            QR_l = model.attn.rope(r_phases, x_sp)
            sc = (QR_l @ QR_l.mT).tril(diagonal=-1)
            ykv = model.ln(sc @ cur_x)
            y_sp = F.relu(ykv @ model.encoder_v)
            y_mlp = (x_sp * y_sp).transpose(1, 2).reshape(1, 1, T, N * nh) @ model.decoder
            cur_x = model.ln(cur_x + model.ln(y_mlp))

            cos_sim = F.cosine_similarity(x_prev.view(-1), cur_x.view(-1), dim=0).item()
            diff_norm = (cur_x - x_prev).norm().item()
            print(f"  Layer {level}: delta={diff_norm:.3f}, cos_sim={cos_sim:.3f}, norm={cur_x.norm().item():.3f}")

        # Next token logits
        logits = cur_x.view(1, T, D) @ model.lm_head
        last_logits = logits[0, -1]
        probs = F.softmax(last_logits, dim=-1)

        print(f"\nTop next-token candidates:")
        topk = torch.topk(probs, 5)
        for rank, (val, idx_val) in enumerate(zip(topk.values, topk.indices), 1):
            bid = idx_val.item()
            ch = repr(chr(bid)) if 32 <= bid <= 126 else f"byte {bid}"
            print(f"  {rank}. {ch:<10} (logit: {last_logits[bid].item():5.2f}, prob: {val.item()*100:5.2f}%)")

        sample = model.generate(idx, max_new_tokens=25, temperature=0.7, top_k=5)
        out_str = bytes(sample[0].cpu().tolist()).decode("utf-8", errors="replace")
        print(f"\nSample generation: {repr(out_str)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect BDH tensor dynamics")
    parser.add_argument("--prompt", type=str, default="paris", help="Input prompt")
    parser.add_argument("--checkpoint", type=str, default="bdh_d64.pt", help="Checkpoint file")
    args = parser.parse_args()

    inspect_inference(prompt=args.prompt, checkpoint=args.checkpoint)
