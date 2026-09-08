"""Trains a Baby Dragon Hatchling (BDH) model on TinyShakespeare."""

import os
import math
import argparse
import dataclasses
import urllib.request
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# Configuration
@dataclasses.dataclass
class BDHConfig:
    n_layer: int = 4
    n_embd: int = 64
    dropout: float = 0.1
    n_head: int = 4
    mlp_internal_dim_multiplier: int = 64
    vocab_size: int = 256


def get_freqs(n, theta, dtype):
    def quantize(t, q=2):
        return (t / q).floor() * q
    return 1.0 / (theta ** (quantize(torch.arange(0, n, 1, dtype=dtype)) / n)) / (2 * math.pi)


class Attention(nn.Module):
    def __init__(self, config: BDHConfig):
        super().__init__()
        self.config = config
        nh = config.n_head
        D = config.n_embd
        N = config.mlp_internal_dim_multiplier * D // nh
        self.freqs = nn.Buffer(
            get_freqs(N, theta=2**16, dtype=torch.float32).view(1, 1, 1, N)
        )

    @staticmethod
    def phases_cos_sin(phases):
        phases = (phases % 1) * (2 * math.pi)
        return torch.cos(phases), torch.sin(phases)

    @staticmethod
    def rope(phases, v):
        v_rot = torch.stack((-v[..., 1::2], v[..., ::2]), dim=-1).view(*v.size())
        phases_cos, phases_sin = Attention.phases_cos_sin(phases)
        return (v * phases_cos).to(v.dtype) + (v_rot * phases_sin).to(v.dtype)

    def forward(self, Q, K, V):
        assert K is Q
        _, _, T, _ = Q.size()
        r_phases = (
            torch.arange(0, T, device=self.freqs.device, dtype=self.freqs.dtype).view(1, 1, -1, 1)
        ) * self.freqs
        QR = self.rope(r_phases, Q)
        KR = QR

        # Unnormalized causal inner product (NO SOFTMAX)
        scores = (QR @ KR.mT).tril(diagonal=-1)
        return scores @ V


class BDH(nn.Module):
    def __init__(self, config: BDHConfig):
        super().__init__()
        self.config = config
        nh = config.n_head
        D = config.n_embd
        N = config.mlp_internal_dim_multiplier * D // nh

        self.embed = nn.Embedding(config.vocab_size, D)
        self.ln = nn.LayerNorm(D, elementwise_affine=False, bias=False)
        self.drop = nn.Dropout(config.dropout)

        self.encoder = nn.Parameter(torch.zeros((nh, D, N)).normal_(std=0.02))
        self.encoder_v = nn.Parameter(torch.zeros((nh, D, N)).normal_(std=0.02))
        self.decoder = nn.Parameter(torch.zeros((nh * N, D)).normal_(std=0.02))

        self.attn = Attention(config)
        self.lm_head = nn.Parameter(torch.zeros((D, config.vocab_size)).normal_(std=0.02))

    def forward(self, idx, targets=None):
        C = self.config
        B, T = idx.size()
        D = C.n_embd
        nh = C.n_head
        N = D * C.mlp_internal_dim_multiplier // nh

        x = self.embed(idx).unsqueeze(1)
        x = self.ln(x)  # (B, 1, T, D)

        for _ in range(C.n_layer):
            x_latent = x @ self.encoder
            x_sparse = F.relu(x_latent)  # Sparse positive activations

            yKV = self.attn(Q=x_sparse, K=x_sparse, V=x)
            yKV = self.ln(yKV)

            y_latent = yKV @ self.encoder_v
            y_sparse = F.relu(y_latent)
            xy_sparse = self.drop(x_sparse * y_sparse)

            yMLP = xy_sparse.transpose(1, 2).reshape(B, 1, T, N * nh) @ self.decoder
            y = self.ln(yMLP)
            x = self.ln(x + y)

        logits = x.view(B, T, D) @ self.lm_head
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens=150, temperature=0.8, top_k=5):
        for _ in range(max_new_tokens):
            logits, _ = self(idx)
            logits = logits[:, -1, :] / temperature
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = float("-inf")
            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx


def ensure_dataset(data_path="input.txt"):
    if not os.path.exists(data_path):
        url = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
        print(f"Downloading TinyShakespeare (~1.1MB) from {url}...")
        urllib.request.urlretrieve(url, data_path)
        print("Download complete.")


def get_batch(data, block_size=256, batch_size=16, device="cpu"):
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([torch.from_numpy(data[i : i + block_size].astype(np.int64)) for i in ix])
    y = torch.stack([torch.from_numpy(data[i + 1 : i + 1 + block_size].astype(np.int64)) for i in ix])
    return x.to(device), y.to(device)


def main():
    parser = argparse.ArgumentParser(description="Train BDH on TinyShakespeare")
    parser.add_argument("--d", type=int, default=64, help="Embedding dimension d (e.g. 64 or 128)")
    parser.add_argument("--iters", type=int, default=800, help="Training iterations")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--block_size", type=int, default=128, help="Context length block size")
    parser.add_argument("--lr", type=float, default=2e-3, help="Learning rate")
    args = parser.parse_args()

    # Device selection (Apple Silicon Metal if available, else CPU)
    if torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")
    print(f"Using device: {device}")

    # Dataset
    data_path = os.path.join(os.path.dirname(__file__), "input.txt")
    ensure_dataset(data_path)
    data = np.memmap(data_path, dtype=np.uint8, mode="r")
    train_data = data[: int(0.9 * len(data))]

    # Model
    config = BDHConfig(n_embd=args.d, n_layer=4, n_head=4, mlp_internal_dim_multiplier=64)
    model = BDH(config).to(device)
    num_params = sum(p.numel() for p in model.parameters())
    print(f"Initialized BDH (d={args.d}) with {num_params / 1e6:.2f}M parameters")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)

    print(f"Starting training for {args.iters} steps...")
    model.train()
    loss_acc = 0.0
    for step in range(1, args.iters + 1):
        x, y = get_batch(train_data, block_size=args.block_size, batch_size=args.batch_size, device=device)
        logits, loss = model(x, y)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        loss_acc += loss.item()
        if step % 100 == 0 or step == args.iters:
            avg_loss = loss_acc / (100 if step % 100 == 0 else step % 100)
            print(f"Step {step:>4}/{args.iters} | Loss: {avg_loss:.4f}")
            loss_acc = 0.0

    # Save checkpoint
    save_file = f"bdh_d{args.d}.pt"
    torch.save({"model_state": model.state_dict(), "config": config}, save_file)
    print(f"Saved model checkpoint to {save_file}")

    # Sample generation
    print("\n--- SAMPLE SHAKESPEARE GENERATION ---")
    model.eval()
    prompt_text = "To be or not to "
    prompt_bytes = torch.tensor(list(prompt_text.encode("utf-8")), dtype=torch.long, device=device).unsqueeze(0)
    generated = model.generate(prompt_bytes, max_new_tokens=120, temperature=0.8, top_k=5)
    generated_text = bytes(generated[0].cpu().tolist()).decode("utf-8", errors="replace")
    print(generated_text)
    print("--------------------------------------\n")


if __name__ == "__main__":
    main()
