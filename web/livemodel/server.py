"""Local BDH checkpoint API for the Live Model UI.

Loads `bdh_d64.pt` and `bdh_d128.pt` from this folder (same directory as this file).
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import torch
import torch.nn.functional as F

from bdh import BDH, BDHConfig

# Checkpoints live beside this server — not a remote path.
CHECKPOINTS = {
    "bdh_d64": HERE / "bdh_d64.pt",
    "bdh_d128": HERE / "bdh_d128.pt",
}

_MODELS: dict[str, BDH] = {}
_DEVICE = torch.device("cpu")


def _safe_checkpoint(model_id: str, filename: str | None) -> Path:
    allowed = CHECKPOINTS.get(model_id)
    if allowed is None:
        raise ValueError(f"Unknown model '{model_id}'")
    if filename:
        candidate = (HERE / Path(filename).name).resolve()
        if candidate != allowed.resolve():
            raise ValueError(f"Checkpoint '{filename}' is not the file for {model_id}")
        return candidate
    return allowed


def load_model(model_id: str, filename: str | None = None) -> BDH:
    path = _safe_checkpoint(model_id, filename)
    if model_id in _MODELS:
        return _MODELS[model_id]
    if not path.is_file():
        raise FileNotFoundError(f"Missing checkpoint {path}")

    import __main__

    __main__.BDHConfig = BDHConfig  # type: ignore[attr-defined]
    blob = torch.load(path, map_location="cpu", weights_only=False)
    if isinstance(blob, dict) and "config" in blob and "model_state" in blob:
        config = blob["config"]
        if not isinstance(config, BDHConfig):
            config = BDHConfig(**{k: getattr(config, k) for k in BDHConfig.__dataclass_fields__})
        model = BDH(config)
        model.load_state_dict(blob["model_state"])
    else:
        raise ValueError(f"Unrecognized checkpoint format in {path.name}")
    model.to(_DEVICE)
    model.eval()
    _MODELS[model_id] = model
    return model


def _bytes_of(text: str) -> list[int]:
    return list(text.encode("latin-1", errors="replace"))


def _disp(ch: str) -> str:
    if ch == " ":
        return "␣"
    if ch == "\n":
        return "↵"
    return ch


def _to_list(t: torch.Tensor) -> list:
    return t.detach().cpu().tolist()


@torch.no_grad()
def trace_prompt(model: BDH, prompt: str) -> dict:
    text = prompt if prompt else "paris"
    ids = _bytes_of(text)
    if len(ids) == 0:
        ids = [ord("p")]
    full_len = len(ids)
    # Token list + heatmap stay usable; keep the *end* of long prompts so the
    # last listed token is the last character in the input.
    ids = ids[-128:]
    chars = [chr(b) if b != 10 else "\n" for b in ids]
    T = len(ids)
    idx = torch.tensor([ids], dtype=torch.long, device=_DEVICE)

    C = model.config
    D = C.n_embd
    nh = C.n_head
    N = D * C.mlp_internal_dim_multiplier // nh

    x = model.embed(idx).unsqueeze(1)
    x = model.ln(x)
    embeddings = [
        {"vector": [round(v, 3) for v in _to_list(x[0, 0, t, :8])]}
        for t in range(T)
    ]

    layers = []
    for _level in range(C.n_layer):
        x_in = x
        x_latent = x @ model.encoder
        x_sparse = F.relu(x_latent)

        Q = x_sparse
        _, _, _, _n = Q.size()
        r_phases = (
            torch.arange(0, T, device=model.attn.freqs.device, dtype=model.attn.freqs.dtype).view(1, 1, -1, 1)
            * model.attn.freqs
        )
        QR = model.attn.rope(r_phases, Q)
        KR = QR
        scores = (QR @ KR.mT).tril(diagonal=-1)
        yKV = scores @ x
        yKV = model.ln(yKV)

        y_latent = yKV @ model.encoder_v
        y_sparse = F.relu(y_latent)
        xy_sparse = x_sparse * y_sparse
        yMLP = xy_sparse.transpose(1, 2).reshape(1, 1, T, N * nh) @ model.decoder
        y = model.ln(yMLP)
        x = model.ln(x + y)

        last_sparse = x_sparse[0, 0, -1]
        active_last = int((last_sparse > 0).sum().item())
        silent_frac = float((x_sparse[0, 0] == 0).float().mean().item())
        sparsity_pct = round(100.0 * silent_frac, 1)
        active_avg = round((1.0 - silent_frac) * N)

        delta = (x - x_in)[0, 0, -1]
        delta_norm = round(float(delta.norm().item()), 2)
        a = x_in[0, 0, -1]
        b = x[0, 0, -1]
        cos = float(F.cosine_similarity(a.unsqueeze(0), b.unsqueeze(0)).item())

        sample = last_sparse[:64]
        heads = []
        for h in range(nh):
            mat = scores[0, h].clamp(min=0)
            heads.append([[round(v, 3) for v in row] for row in _to_list(mat)])

        hebbian_steps = []
        rho = torch.zeros(N, D, device=_DEVICE)
        v_seq = x_in[0, 0]
        k_seq = QR[0, 0]
        for t in range(T):
            k = k_seq[t]
            v = v_seq[t]
            read = k @ rho
            hebbian_steps.append(
                {
                    "char": chars[t],
                    "rho_norm": f"{float(rho.norm().item()):.2f}",
                    "read_norm": f"{float(read.norm().item()):.2f}",
                    "k_norm": f"{float(k.norm().item()):.2f}",
                    "v_norm": f"{float(v.norm().item()):.2f}",
                }
            )
            rho = rho + torch.outer(k, v)

        contrib_vec = xy_sparse[0, :, -1, :].reshape(nh * N)
        decoder = model.decoder
        strengths = contrib_vec.abs() * decoder.norm(dim=1)
        topk = torch.topk(strengths, k=min(8, strengths.numel()))
        neuron_contributions_top = []
        for idx_n, val in zip(topk.indices.tolist(), topk.values.tolist()):
            head = idx_n // N
            local = idx_n % N
            act = float(contrib_vec[idx_n].item())
            neuron_contributions_top.append(
                {
                    "neuron_id": int(local if head == 0 else idx_n),
                    "head": int(head),
                    "contribution": round(float(val), 3),
                    "activation": round(act, 3),
                    "vector_sample": [round(v, 2) for v in _to_list(decoder[idx_n, :4])],
                }
            )

        layers.append(
            {
                "sparsity_pct": f"{sparsity_pct:.1f}",
                "delta_norm": f"{delta_norm:.2f}",
                "cosine_similarity": f"{cos:.3f}",
                "active_neurons_avg": int(active_avg),
                "active_neuron_count_last": active_last,
                "head0_sample_neurons": [round(v, 4) for v in _to_list(sample)],
                "attention_heads": heads,
                "hebbian_steps": hebbian_steps,
                "neuron_contributions_top": neuron_contributions_top,
            }
        )

    logits = x.view(1, T, D) @ model.lm_head
    probs = F.softmax(logits[0, -1], dim=-1)
    topv, topi = torch.topk(probs, k=8)
    predictions = []
    for p, b in zip(topv.tolist(), topi.tolist()):
        ch = chr(b) if 32 <= b < 127 or b in (10, 32) else "?"
        predictions.append(
            {
                "char": _disp(ch if b != 10 else "\n"),
                "byte_id": int(b),
                "prob_percent": round(p * 100.0, 2),
            }
        )

    return {
        "prompt": text[-128:],
        "prompt_length": full_len,
        "model": f"bdh_d{D}",
        "sequence_length": T,
        "chars": chars,
        "tokens": ids,
        "config": {"latent_dim": N, "d": D, "layers": C.n_layer, "heads": nh},
        "token_embeddings": embeddings,
        "layers": layers,
        "predictions": predictions,
        "generated_text": "",
    }


@torch.no_grad()
def generate_text(model: BDH, prompt: str, max_tokens: int, temperature: float) -> str:
    text = prompt if prompt else "paris"
    ids = _bytes_of(text)[:128]
    if not ids:
        ids = [ord("p")]
    idx = torch.tensor([ids], dtype=torch.long, device=_DEVICE)
    out = model.generate(idx, max_new_tokens=max_tokens, temperature=max(0.05, temperature), top_k=50)
    raw = bytes(out[0].tolist())
    return raw.decode("latin-1", errors="replace")


def _relu(x: float) -> float:
    return max(0.0, x)


def _outer(k: list[float], v: list[float]) -> list[list[float]]:
    return [[ki * vj for vj in v] for ki in k]


def _clone(m: list[list[float]]) -> list[list[float]]:
    return [row[:] for row in m]


def _write(rho: list[list[float]], k: list[float], v: list[float]) -> None:
    for i, ki in enumerate(k):
        if ki == 0:
            continue
        row = rho[i]
        for j, vj in enumerate(v):
            row[j] += ki * vj


def _read(rho: list[list[float]], k: list[float]) -> list[float]:
    d = len(rho[0])
    out = [0.0] * d
    for i, ki in enumerate(k):
        if ki == 0:
            continue
        row = rho[i]
        for j in range(d):
            out[j] += ki * row[j]
    return out


def micro_data() -> dict:
    neurons = [
        "n0 idle",
        "n1 country",
        "n2 France",
        "n3 Japan",
        "n4 Germany",
        "n5 EU",
        "n6 Asia",
        "n7 mix",
    ]
    france_k = [0.0, 0.8, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    japan_k = [0.0, 0.8, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0]
    germany_k = [0.0, 0.8, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0]
    paris, tokyo, berlin = [1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]
    rho = [[0.0] * 3 for _ in range(8)]
    steps = []
    for cue, val, key, value in (
        ("France", "Paris", france_k, paris),
        ("Japan", "Tokyo", japan_k, tokyo),
        ("Germany", "Berlin", germany_k, berlin),
    ):
        delta = _outer(key, value)
        _write(rho, key, value)
        steps.append(
            {
                "cue": cue,
                "val": val,
                "key_vector": key,
                "val_vector": value,
                "outer_product": delta,
                "rho_after": _clone(rho),
            }
        )
    q = france_k
    retrieved = _read(rho, q)
    beat3 = {
        "neurons": neurons,
        "steps": steps,
        "final_rho": _clone(rho),
        "query_france": {"q_vector": q, "retrieved": retrieved},
    }

    X = [[1.0, 0.0], [0.5, 1.0], [1.0, 0.5]]
    W = [[1.0, 0.0, 0.6], [0.0, 1.0, 0.6]]
    K = []
    for x in X:
        k = []
        for i in range(3):
            s = x[0] * W[0][i] + x[1] * W[1][i]
            k.append(_relu(s))
        K.append(k)
    rho3 = [[0.0] * 2 for _ in range(3)]
    bdh_steps = []
    T = len(X)
    scores = [[0.0] * T for _ in range(T)]
    parallel = [[0.0] * 2 for _ in range(T)]
    for t, x in enumerate(X):
        k = K[t]
        read_vec = _read(rho3, k)
        delta = _outer(k, x)
        _write(rho3, k, x)
        bdh_steps.append(
            {
                "k_vector": k,
                "x_vector": x,
                "outer_matrix": delta,
                "rho_after": _clone(rho3),
                "read_vector": read_vec,
            }
        )
        for s in range(t):
            score = sum(k[i] * K[s][i] for i in range(3))
            scores[t][s] = score
            for j in range(2):
                parallel[t][j] += score * X[s][j]

    return {
        "beat3": beat3,
        "bdh_micro": {
            "steps": bdh_steps,
            "scores_matrix": scores,
            "parallel_output": parallel,
        },
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("livemodel-api: " + (fmt % args) + "\n")

    def _send(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", "/health", "/api/health"):
            self._send(
                200,
                {
                    "ok": True,
                    "service": "livemodel-api",
                    "models": [name for name, p in CHECKPOINTS.items() if p.is_file()],
                },
            )
            return
        if path == "/api/micro_data":
            self._send(200, micro_data())
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._send(400, {"error": "invalid json"})
            return
        path = urlparse(self.path).path
        try:
            if path == "/api/trace":
                model_id = body.get("model", "bdh_d64")
                ckpt = body.get("checkpoint")
                model = load_model(model_id, ckpt)
                self._send(200, trace_prompt(model, str(body.get("prompt", "paris"))))
                return
            if path == "/api/generate":
                model_id = body.get("model", "bdh_d64")
                ckpt = body.get("checkpoint")
                model = load_model(model_id, ckpt)
                n = int(body.get("max_tokens", 50))
                n = max(1, min(n, 80))
                text = generate_text(
                    model,
                    str(body.get("prompt", "paris")),
                    n,
                    float(body.get("temperature", 0.75)),
                )
                self._send(200, {"generated_text": text})
                return
        except Exception as exc:
            traceback.print_exc()
            self._send(500, {"error": str(exc)})
            return
        self._send(404, {"error": "not found"})


class ReuseHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def main() -> None:
    port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    # Railway/Render set PORT and must bind all interfaces. Local Vite still
    # talks to 127.0.0.1:8765, which 0.0.0.0 also accepts.
    host = os.environ.get("HOST") or "0.0.0.0"
    for model_id, path in CHECKPOINTS.items():
        if path.is_file():
            print(f"loading {model_id} from {path.name}…", flush=True)
            load_model(model_id)
    server = ReuseHTTPServer((host, port), Handler)
    print(f"livemodel API on http://{host}:{port}", flush=True)
    print("checkpoints:", {k: str(v) for k, v in CHECKPOINTS.items()}, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
