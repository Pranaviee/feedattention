"""Text generation and prompt completion using trained BDH checkpoints."""

import os
import argparse
import torch
import torch.nn.functional as F
from train_bdh_tinyshakespeare import BDH, BDHConfig

import __main__
__main__.BDHConfig = BDHConfig
__main__.BDH = BDH


def load_model(checkpoint_path: str, device: torch.device):
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint '{checkpoint_path}' not found")

    chk = torch.load(checkpoint_path, map_location=device, weights_only=False)
    config = chk["config"]
    model = BDH(config).to(device)
    model.load_state_dict(chk["model_state"])
    model.eval()
    return model, config


def run_inference(model, prompt: str, device: torch.device, max_tokens: int = 150, temperature: float = 0.75, top_k: int = 5, rep_penalty: float = 1.25):
    tokens = list(prompt.encode("utf-8")) if prompt else [ord(" ")]
    idx = torch.tensor([tokens], dtype=torch.long, device=device)

    with torch.no_grad():
        logits, _ = model(idx)
        last_logits = logits[0, -1] / temperature
        probs = F.softmax(last_logits, dim=-1)
        topk_probs, topk_indices = torch.topk(probs, min(5, probs.size(-1)))

    print(f"\nPrompt: {repr(prompt)}")
    print("Next token candidates:")
    for rank, (p, idx_val) in enumerate(zip(topk_probs, topk_indices), 1):
        bid = idx_val.item()
        char_repr = repr(chr(bid)) if 32 <= bid <= 126 else f"byte {bid}"
        print(f"  {rank}. {char_repr:<10} ({p.item()*100:5.1f}%)")

    with torch.no_grad():
        curr = idx
        for _ in range(max_tokens):
            logits, _ = model(curr)
            l_log = logits[:, -1, :] / temperature
            if rep_penalty != 1.0 and curr.size(1) > 0:
                recent = set(curr[0, -15:].tolist())
                for t in recent:
                    if l_log[0, t] > 0:
                        l_log[0, t] /= rep_penalty
                    else:
                        l_log[0, t] *= rep_penalty
            if top_k is not None:
                v, _ = torch.topk(l_log, min(top_k, l_log.size(-1)))
                l_log[l_log < v[:, [-1]]] = float("-inf")
            p_dist = F.softmax(l_log, dim=-1)
            idx_next = torch.multinomial(p_dist, num_samples=1)
            curr = torch.cat([curr, idx_next], dim=1)
        generated_text = bytes(curr[0].cpu().tolist()).decode("utf-8", errors="replace")

    print(f"\nGenerated:\n{generated_text}\n")
    return generated_text


def main():
    parser = argparse.ArgumentParser(description="BDH Text Inference")
    parser.add_argument("--prompt", type=str, default=None, help="Input prompt")
    parser.add_argument("--model", type=str, default="bdh_d128.pt", help="Checkpoint file")
    parser.add_argument("--max_tokens", type=int, default=150, help="Tokens to generate")
    parser.add_argument("--temperature", type=float, default=0.75, help="Sampling temperature")
    parser.add_argument("--top_k", type=int, default=5, help="Top-K sampling")
    args = parser.parse_args()

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model_path = args.model
    if not os.path.exists(model_path) and os.path.exists("bdh_d64.pt"):
        model_path = "bdh_d64.pt"

    model, config = load_model(model_path, device)
    print(f"Loaded {model_path} (d={config.n_embd}, layers={config.n_layer}, heads={config.n_head}) on {device}")

    if args.prompt is not None:
        run_inference(model, args.prompt, device, args.max_tokens, args.temperature, args.top_k)
    else:
        print("Interactive mode. Enter prompt or type 'exit' to quit.")
        while True:
            try:
                user_prompt = input("\n> ")
                if not user_prompt.strip():
                    continue
                if user_prompt.strip().lower() in ("exit", "quit", "q"):
                    break
                run_inference(model, user_prompt, device, args.max_tokens, args.temperature, args.top_k)
            except (KeyboardInterrupt, EOFError):
                break


if __name__ == "__main__":
    main()
