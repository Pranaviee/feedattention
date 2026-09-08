"""
BDH Explainer - Backend API Server
Runs live inference with trained BDH models and returns full intermediate tensor states,
sparse activation maps, Hebbian memory states, and output probabilities.
"""

import os
import math
from flask import Flask, request, jsonify, send_from_directory
import torch
import torch.nn.functional as F

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import train_bdh_tinyshakespeare
from train_bdh_tinyshakespeare import BDH, BDHConfig

# Alias __main__ attributes for pickle compatibility
import __main__
__main__.BDHConfig = BDHConfig
__main__.BDH = BDH

app = Flask(__name__, static_folder="static", static_url_path="")

# Load models into memory
DEVICE = torch.device("cpu")
MODELS = {}

def load_checkpoint_if_exists(filename, key):
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", filename))
    if os.path.exists(path):
        chk = torch.load(path, map_location=DEVICE, weights_only=False)
        config = chk["config"]
        model = BDH(config).to(DEVICE)
        model.load_state_dict(chk["model_state"])
        model.eval()
        MODELS[key] = (model, config)
        print(f"Loaded model {key} from {path}")
    else:
        print(f"Warning: {path} not found")

load_checkpoint_if_exists("bdh_d64.pt", "bdh_d64")
load_checkpoint_if_exists("bdh_d128.pt", "bdh_d128")

if not MODELS:
    # Initialize fallback model
    default_config = BDHConfig(n_layer=4, n_embd=64, n_head=4, mlp_internal_dim_multiplier=64)
    fallback_model = BDH(default_config).to(DEVICE)
    fallback_model.eval()
    MODELS["bdh_d64"] = (fallback_model, default_config)


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/models")
def get_models():
    return jsonify({
        "available": list(MODELS.keys()),
        "default": "bdh_d64" if "bdh_d64" in MODELS else list(MODELS.keys())[0]
    })


@app.route("/api/micro_data")
def micro_data():
    """Returns exact small-dimensional matrix operations for educational visualization."""
    import numpy as np

    # 1. Associative Memory Demo (n=8 neurons, d=3 values)
    neurons_b3 = ["n1 (country)", "n2 (France)", "n3 (Japan)", "n4 (Germany)", "n5", "n6", "n7", "n8"]
    keys_b3 = {
        "France":  [0.8, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "Japan":   [0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        "Germany": [0.8, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]
    }
    values_b3 = {
        "Paris":  [1.0, 0.0, 0.0],
        "Tokyo":  [0.0, 1.0, 0.0],
        "Berlin": [0.0, 0.0, 1.0]
    }
    
    rho_b3 = np.zeros((8, 3))
    steps_b3 = []
    pairs = [("France", "Paris"), ("Japan", "Tokyo"), ("Germany", "Berlin")]
    for idx, (cue, val) in enumerate(pairs):
        k = np.array(keys_b3[cue])
        v = np.array(values_b3[val])
        outer = np.outer(k, v)
        rho_before = rho_b3.copy()
        rho_b3 += outer
        steps_b3.append({
            "step": idx,
            "cue": cue,
            "val": val,
            "key_vector": k.tolist(),
            "val_vector": v.tolist(),
            "outer_product": outer.tolist(),
            "rho_before": rho_before.tolist(),
            "rho_after": rho_b3.tolist()
        })
    
    # Query France
    q_fr = np.array(keys_b3["France"])
    read_fr = q_fr @ rho_b3
    row_mults = [
        {"neuron": "n1", "scale": 0.8, "row": rho_b3[0].tolist(), "result": (0.8 * rho_b3[0]).tolist()},
        {"neuron": "n2", "scale": 1.0, "row": rho_b3[1].tolist(), "result": (1.0 * rho_b3[1]).tolist()}
    ]

    # 2. Live BDH Micro Model (d=2, n=3, T=3)
    x_micro = np.array([[1.0, 2.0], [3.0, 0.0], [0.0, 2.0]])
    W_enc = np.array([[1.0, -1.0, 2.0], [0.5, 1.0, -0.5]])
    k_micro = np.maximum(0, x_micro @ W_enc)
    q_micro = k_micro

    rho_micro = np.zeros((3, 2))
    steps_micro = []
    for t in range(3):
        read_t = (q_micro[t] @ rho_micro).tolist()
        outer = np.outer(k_micro[t], x_micro[t])
        rho_before = rho_micro.copy().tolist()
        rho_micro += outer
        steps_micro.append({
            "step": t,
            "token_label": f"Token {t}",
            "x_vector": x_micro[t].tolist(),
            "k_vector": k_micro[t].tolist(),
            "read_vector": read_t,
            "outer_matrix": outer.tolist(),
            "rho_before": rho_before,
            "rho_after": rho_micro.tolist()
        })

    scores_micro = np.tril(q_micro @ k_micro.T, k=-1)
    out_parallel = scores_micro @ x_micro

    return jsonify({
        "beat3": {
            "title": "Hebbian Associative Memory Demo (France → Paris)",
            "n": 8,
            "d": 3,
            "neurons": neurons_b3,
            "value_labels": ["Paris (col 0)", "Tokyo (col 1)", "Berlin (col 2)"],
            "steps": steps_b3,
            "final_rho": rho_b3.tolist(),
            "query_france": {
                "cue": "France",
                "q_vector": q_fr.tolist(),
                "row_mults": row_mults,
                "readout_vector": read_fr.tolist(),
                "winner": "Paris (1.64)",
                "crosstalk": "Tokyo (0.64), Berlin (0.64)"
            }
        },
        "bdh_micro": {
            "title": "BDH Pure Attention Micro Model (d=2, n=3, T=3)",
            "d": 2,
            "n": 3,
            "T": 3,
            "encoder_matrix": W_enc.tolist(),
            "tokens": x_micro.tolist(),
            "k_activations": k_micro.tolist(),
            "steps": steps_micro,
            "scores_matrix": scores_micro.tolist(),
            "parallel_output": out_parallel.tolist()
        }
    })


@app.route("/api/trace", methods=["GET", "POST"])
def trace():
    data = request.get_json(silent=True) or request.args
    prompt = data.get("prompt", "paris")
    if not prompt:
        prompt = "paris"
    # Limit max prompt length for visualizer clarity
    prompt = prompt[:32]

    model_key = data.get("model", "bdh_d64")
    if model_key not in MODELS:
        model_key = list(MODELS.keys())[0]
    model, config = MODELS[model_key]

    tokens = list(prompt.encode("utf-8"))
    chars = [chr(t) if 32 <= t <= 126 else f"\\x{t:02x}" for t in tokens]
    T = len(tokens)
    idx = torch.tensor([tokens], dtype=torch.long, device=DEVICE)

    with torch.no_grad():
        C = config
        nh = C.n_head
        D = C.n_embd
        N = D * C.mlp_internal_dim_multiplier // nh

        # 1. Embedding & Initial LN
        embed_raw = model.embed(idx).unsqueeze(1)  # (1, 1, T, D)
        x_init = model.ln(embed_raw)               # (1, 1, T, D)

        cur_x = x_init
        layers_data = []

        # RoPE phases
        r_phases = (
            torch.arange(0, T, device=model.attn.freqs.device, dtype=model.attn.freqs.dtype).view(1, 1, -1, 1)
        ) * model.attn.freqs

        for level in range(C.n_layer):
            x_prev = cur_x
            
            # Step 1: Latent expansion
            x_latent = cur_x @ model.encoder  # (1, nh, T, N)
            
            # Step 2: ReLU Sparsification
            x_sparse = F.relu(x_latent)       # (1, nh, T, N)
            active_count = (x_sparse > 0).sum(dim=-1).float().mean().item()
            sparsity_pct = (x_sparse == 0).float().mean().item() * 100.0

            # Step 3: RoPE & Attention
            QR = model.attn.rope(r_phases, x_sparse)
            KR = QR
            scores = (QR @ KR.mT).tril(diagonal=-1)  # (1, nh, T, T)

            # Step 4: Value readout
            yKV_raw = scores @ cur_x                 # (1, nh, T, D)
            yKV = model.ln(yKV_raw)

            # Sequential Hebbian loop simulation for head 0
            hebbian_steps = []
            q_head0 = QR[0, 0]                       # (T, N)
            k_head0 = q_head0
            v_token = cur_x[0, 0]                    # (T, D)
            rho = torch.zeros((N, D), dtype=torch.float32)
            
            for t in range(T):
                read_vec = q_head0[t] @ rho
                read_norm = float(read_vec.norm().item())
                hebbian_update = torch.outer(k_head0[t], v_token[t])
                rho += hebbian_update
                rho_norm = float(rho.norm().item())
                hebbian_steps.append({
                    "token_idx": t,
                    "char": chars[t],
                    "read_norm": round(read_norm, 2),
                    "rho_norm": round(rho_norm, 2),
                    "k_norm": round(float(k_head0[t].norm().item()), 2),
                    "v_norm": round(float(v_token[t].norm().item()), 2)
                })

            # Step 5: Latent value projection & 3-factor gating
            y_latent = yKV @ model.encoder_v
            y_sparse = F.relu(y_latent)
            xy_sparse = x_sparse * y_sparse          # (1, nh, T, N)
            gating_sparsity = (xy_sparse == 0).float().mean().item() * 100.0

            # Step 6: Decoder projection & neuron vector summation
            # Flatten heads for position T-1 (last token)
            a_last = xy_sparse.transpose(1, 2).reshape(1, 1, T, N * nh)[0, 0, -1]  # (N*nh,)
            W_dec = model.decoder                    # (N*nh, D)
            
            active_neuron_indices = torch.where(a_last > 0)[0]
            neuron_contributions = []
            for n_idx in active_neuron_indices:
                act = float(a_last[n_idx].item())
                vec = W_dec[n_idx]
                v_norm = float(vec.norm().item())
                c_norm = act * v_norm
                neuron_contributions.append({
                    "neuron_id": int(n_idx.item()),
                    "head": int(n_idx.item() // N),
                    "local_id": int(n_idx.item() % N),
                    "activation": round(act, 4),
                    "vector_norm": round(v_norm, 4),
                    "contribution": round(c_norm, 4),
                    "vector_sample": [round(float(val), 3) for val in vec[:6].tolist()]
                })
            neuron_contributions.sort(key=lambda item: item["contribution"], reverse=True)

            yMLP = xy_sparse.transpose(1, 2).reshape(1, 1, T, N * nh) @ model.decoder
            y_normed = model.ln(yMLP)
            cur_x = model.ln(cur_x + y_normed)

            delta_norm = float((cur_x - x_prev).norm().item())
            cos_sim = float(F.cosine_similarity(x_prev.view(-1), cur_x.view(-1), dim=0).item())

            # Sample 64 neurons of head 0 for heatmap visualization
            head0_last_neurons = [round(float(v), 3) for v in x_sparse[0, 0, -1, :64].tolist()]
            head0_gated_neurons = [round(float(v), 3) for v in xy_sparse[0, 0, -1, :64].tolist()]

            # Format attention scores per head
            attn_matrices = []
            for h in range(nh):
                h_mat = []
                for r in range(T):
                    row_vals = [round(float(scores[0, h, r, c].item()), 2) for c in range(T)]
                    h_mat.append(row_vals)
                attn_matrices.append(h_mat)

            layers_data.append({
                "layer_index": level,
                "active_neurons_avg": round(active_count, 1),
                "sparsity_pct": round(sparsity_pct, 1),
                "gating_sparsity_pct": round(gating_sparsity, 1),
                "delta_norm": round(delta_norm, 2),
                "cosine_similarity": round(cos_sim, 3),
                "x_norm": round(float(cur_x.norm().item()), 2),
                "attention_heads": attn_matrices,
                "hebbian_steps": hebbian_steps,
                "neuron_contributions_top": neuron_contributions[:12],
                "active_neuron_count_last": len(active_neuron_indices),
                "head0_sample_neurons": head0_last_neurons,
                "head0_gated_sample_neurons": head0_gated_neurons
            })

        # Final Logits & Decoding
        logits = cur_x.view(1, T, D) @ model.lm_head  # (1, T, vocab_size)
        last_logits = logits[0, -1]
        probs = F.softmax(last_logits, dim=-1)
        topk_probs, topk_indices = torch.topk(probs, 10)

        predictions = []
        for p, idx_v in zip(topk_probs, topk_indices):
            bid = int(idx_v.item())
            prob_pct = round(float(p.item()) * 100, 2)
            logit_val = round(float(last_logits[bid].item()), 2)
            if bid == 32:
                char_str = "␣ (space)"
            elif bid == 10:
                char_str = "↵ (newline)"
            elif 33 <= bid <= 126:
                char_str = repr(chr(bid))
            else:
                char_str = f"0x{bid:02x}"
            predictions.append({
                "byte_id": bid,
                "char": char_str,
                "logit": logit_val,
                "prob_percent": prob_pct
            })

        # Token embedding sample vectors for inspection
        token_embeddings = []
        for i in range(T):
            token_embeddings.append({
                "pos": i,
                "char": chars[i],
                "byte_id": tokens[i],
                "vector": [round(float(v), 3) for v in x_init[0, 0, i, :8].tolist()]
            })

    return jsonify({
        "prompt": prompt,
        "tokens": tokens,
        "chars": chars,
        "sequence_length": T,
        "config": {
            "d_model": D,
            "n_layer": C.n_layer,
            "n_head": nh,
            "latent_dim": N,
            "total_latent_neurons": N * nh
        },
        "token_embeddings": token_embeddings,
        "layers": layers_data,
        "predictions": predictions
    })


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True)
    prompt = data.get("prompt", "paris")
    max_tokens = int(data.get("max_tokens", 30))
    temperature = float(data.get("temperature", 0.75))
    top_k = int(data.get("top_k", 5))
    model_key = data.get("model", "bdh_d64")

    if model_key not in MODELS:
        model_key = list(MODELS.keys())[0]
    model, _ = MODELS[model_key]

    tokens = list(prompt.encode("utf-8")) if prompt else [ord(" ")]
    idx = torch.tensor([tokens], dtype=torch.long, device=DEVICE)
    rep_penalty = float(data.get("repetition_penalty", 1.25))

    with torch.no_grad():
        curr_idx = idx
        for _ in range(max_tokens):
            logits, _ = model(curr_idx)
            last_logits = logits[:, -1, :] / temperature

            # Repetition penalty on recent 15 tokens to prevent stutter loops
            if rep_penalty != 1.0 and curr_idx.size(1) > 0:
                recent = set(curr_idx[0, -15:].tolist())
                for t in recent:
                    if last_logits[0, t] > 0:
                        last_logits[0, t] /= rep_penalty
                    else:
                        last_logits[0, t] *= rep_penalty

            if top_k is not None:
                v, _ = torch.topk(last_logits, min(top_k, last_logits.size(-1)))
                last_logits[last_logits < v[:, [-1]]] = float("-inf")

            probs = F.softmax(last_logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            curr_idx = torch.cat([curr_idx, idx_next], dim=1)

        generated_bytes = curr_idx[0].cpu().tolist()
        generated_text = bytes(generated_bytes).decode("utf-8", errors="replace")

    return jsonify({
        "prompt": prompt,
        "generated_text": generated_text,
        "new_tokens_count": len(generated_bytes) - len(tokens)
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    
    print(f"Starting BDH Explainer on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
