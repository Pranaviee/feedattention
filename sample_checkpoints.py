"""Samples completions from trained BDH checkpoints across test prompts."""

import os
import torch
from train_bdh_tinyshakespeare import BDH, BDHConfig


def test_checkpoint(checkpoint_path, prompts, max_tokens=100, temp=0.75):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    if not os.path.exists(checkpoint_path):
        print(f"Checkpoint {checkpoint_path} not found")
        return

    chk = torch.load(checkpoint_path, map_location=device, weights_only=False)
    config = chk["config"]
    model = BDH(config).to(device)
    model.load_state_dict(chk["model_state"])
    model.eval()

    print(f"\nCheckpoint: {checkpoint_path} (d={config.n_embd}) on {device}")
    for i, p in enumerate(prompts, 1):
        p_bytes = torch.tensor(list(p.encode("utf-8")), dtype=torch.long, device=device).unsqueeze(0)
        out_tokens = model.generate(p_bytes, max_new_tokens=max_tokens, temperature=temp, top_k=5)
        out_text = bytes(out_tokens[0].cpu().tolist()).decode("utf-8", errors="replace")
        print(f"\n[Prompt {i}]: {repr(p)}")
        print(out_text)


if __name__ == "__main__":
    prompts = [
        "First Citizen:\nBefore we proceed ",
        "ROMEO:\nI take thee at thy word:\nCall me but ",
        "KING RICHARD:\nGive me another horse: ",
    ]

    test_checkpoint("bdh_d64.pt", prompts)
    test_checkpoint("bdh_d128.pt", prompts)
