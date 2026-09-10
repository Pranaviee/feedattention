# Memory in the Wiring
### Synaptic Plasticity as Short-Term Memory — and where it lives in BDH

---

**The claim (pinned at the top of every screen):**

> A fixed-size synaptic memory can absorb an unlimited number of associations without ever growing. But every new memory is added on top of the old ones in the same table, so recall degrades as the table fills — and collapses much earlier when the cues look alike.

**How you could prove it wrong:** store 500 items in a 64-wide table and recall all of them perfectly; or show that overlapping cues cost nothing; or watch the table grow when you add an item. All three are one slider away.

**Who this is for.** A working data scientist who knows what a dot product and a matrix multiply are, and has used a language model. No prior knowledge of attention, Transformers, or neuroscience is assumed.

**What you will be able to do afterwards.**
1. Explain how an association is stored by changing connection strengths, and how it is read back.
2. Predict when recall will fail from two numbers: how many items are stored, and how wide the memory is.
3. Explain why similar cues damage recall more than extra unrelated items.
4. Point to the exact place this mechanism sits inside BDH, and say what BDH gains from it and what it pays.
5. Say clearly which parts of what you saw are a teaching toy and which are the real system, and name one open question.

**Screen layout.** The left panel is fixed and never leaves: a memory table drawn as a heatmap (rows are neurons, columns are value dimensions) and, below it, a two-column readout — *stored* on the left, *retrieved* on the right. The story runs on the right. Each beat changes what is loaded into the table and unlocks one control. Every panel carries one of three tags: **LIVE** (computed in your browser right now), **PRECOMPUTED** (swept offline, shipped as data), **CITED** (a published result we did not reproduce).

---

## Beat 1 — The problem with remembering

**[Screen: no table yet. A short conversation, four lines. Line four asks a question about line one.]**

To answer the last question, the model needs the first line. So it has to have kept it somewhere.

The obvious way to keep it: store every line exactly as it arrived. Look it up when needed. Recall is perfect. Nothing is ever lost.

The cost is just as obvious. The store gets one entry longer for every piece of text. A conversation twice as long needs twice the memory. Answering the next question means checking against everything stored so far, so the work per answer grows too.

**[Screen: a bar labelled "stored entries" grows one notch per line as the conversation extends.]**

Here is the question this whole page is about.

**What if we refused to let the memory grow?** Not "compress it a bit." Fix its size in advance, before we know how long the conversation will be, and never let it change.

Something has to give. The rest of this page is about finding out exactly what.

---

## Beat 2 — The idea: store it in the wiring

**[Screen: eight small circles appear, labelled n1 … n8. Below them, an empty 8-row table.]**

Start with the pieces.

A **neuron** here is a detector. It holds a fixed pattern. When an input matches its pattern, it outputs a positive number — it "fires." When the input doesn't match, it outputs zero. For any one input, a few neurons fire and most stay silent.

Where do the patterns come from? In a real system they are learned by training. In this toy we assign them by hand, so you can read them. That difference matters and we will come back to it. For now: a neuron fires for a pattern; it does not "know a word."

A **synapse** is a connection from one neuron to something else, and it has a **strength** — a number that can change.

Now the idea, which is about eighty years old and is usually credited to Donald Hebb: **when two things are active at the same time, strengthen the connection between them.**

That single rule is the whole memory mechanism. To store something, you do not append a new entry anywhere. You nudge strengths that already exist.

**[Screen: the 8-row table is labelled "synaptic memory." Its dimensions are printed: 8 rows × 3 columns. A caption reads: "This table will never change size."]**

And this is the payoff we were after. The table's size — its number of rows and columns — is fixed before the first input arrives. Store one association or a thousand: the table is the same shape.

We have paid nothing yet. Beat 4 is where the bill arrives. First, let's see it work.

---

## Beat 3 — How you get it back

Intuition first, then the exact steps.

**The intuition.** Storing an association means: take the neurons that fire for the *cue*, and into each of their rows, add the *item*. Recalling means: fire the cue's neurons again, and add up their rows. Whatever was added most consistently across those rows comes back strongest.

Now the full chain, one tiny example, no steps skipped.

### 3.1 — Representation: turning a word into a pattern

**[Screen: three cue words on the left — France, Japan, Germany. Next to each, which of n1…n8 light up.]**

| input | neurons that fire (the **key**) |
|---|---|
| France | n1 (0.8), n2 (1.0) |
| Japan | n1 (0.8), n3 (1.0) |
| Germany | n1 (0.8), n4 (1.0) |

Notice n1 fires for all three. We built it that way: n1 is a detector for something all three inputs share. Call it "country-ish." n2, n3, n4 each fire for one input only.

The **key** for an input is this whole firing pattern, written as a vector of 8 numbers — one per neuron, zero for the ones that stayed silent. France's key is `[0.8, 1.0, 0, 0, 0, 0, 0, 0]`.

**What this pattern is not.** It is not the meaning of "France." The memory never sees the word. It sees eight numbers. If we had wired the detectors differently, France would have a different key and the memory would work exactly the same way. The key is an address, produced by the detectors — nothing more.

### 3.2 — The value: what gets stored

Each item to be remembered also needs a vector — the **value**. Here we use the simplest possible code, three columns for three possible items:

| item | value vector |
|---|---|
| Paris | (1, 0, 0) |
| Tokyo | (0, 1, 0) |
| Berlin | (0, 0, 1) |

Same warning. These are codes we assigned. The column labelled "Paris" is only "Paris" because we say so when we read it back.

### 3.3 — The write

**[LEARNER ACTION: press "Store France → Paris." Watch rows n1 and n2 change.]**

The rule: every neuron that fires for the cue adds the value into its own row, scaled by how strongly it fired.

```
row(n1) += 0.8 × (1, 0, 0)
row(n2) += 1.0 × (1, 0, 0)
```

**[Screen: the table, LIVE.]**

```
              Paris  Tokyo  Berlin
n1  country    0.8    0      0
n2  France     1.0    0      0
n3  Japan      0      0      0
n4  Germany    0      0      0
n5–n8          0      0      0
```

**[LEARNER ACTION: press "Store Japan → Tokyo." Then "Store Germany → Berlin."]**

```
              Paris  Tokyo  Berlin
n1  country    0.8    0.8    0.8     ← fired every time; holds all three
n2  France     1.0    0      0
n3  Japan      0      1.0    0
n4  Germany    0      0      1.0
n5–n8          0      0      0       ← never fired; hold nothing
```

That table is the entire memory. Three associations, stored. The table is still 8 × 3. Nothing was appended. Only the numbers inside moved.

This is the smallest useful way to write the rule:

$$\rho \;\leftarrow\; \rho + \mathbf{k}\,\mathbf{v}^{\top}$$

*In words:* the table (ρ) gets the key vector times the value vector added to it. The product **k vᵀ** is a table the same shape as ρ where cell (i, j) equals key[i] × value[j] — so a row is nonzero only if that neuron fired, and it holds the value scaled by how hard the neuron fired. That is exactly what you just watched happen.

### 3.4 — The read

**[LEARNER ACTION: press "Query: France." Before the result appears, predict: what comes out?]**

The cue "France" hits the detectors again. Same pattern: n1 at 0.8, n2 at 1.0. Now instead of writing, we read: take each firing neuron's row, scale it by how hard the neuron fired, and add them up.

```
0.8 × row(n1) = 0.8 × (0.8, 0.8, 0.8) = (0.64, 0.64, 0.64)
1.0 × row(n2) = 1.0 × (1.0, 0,   0  ) = (1.00, 0,    0   )
                                sum = (1.64, 0.64, 0.64)
```

**[Screen: readout panel, LIVE. Left column "stored": Paris (1, 0, 0). Right column "retrieved": (1.64, 0.64, 0.64).]**

As an equation:

$$\hat{\mathbf{v}} = \mathbf{k}^{\top}\rho$$

*In words:* the retrieved vector is the key times the table.

### 3.5 — Decode

The retrieved vector is `(1.64, 0.64, 0.64)`. Which item is that? In this toy, we decode by asking which stored value it is closest to. The Paris column is largest. **Output: Paris.** Correct.

But look at the other two numbers. Tokyo got 0.64. Berlin got 0.64. Neither should have.

**Why they're there.** n1 fires for France. But n1 also fired when Japan→Tokyo and Germany→Berlin were stored, so n1's row picked up all three items. Reading through n1 pulls all three back. The only reason Paris wins is n2 — the one neuron that fires for France alone — adding a clean extra 1.0 to Paris.

This is the sentence to remember from this beat:

> **Recall is a mixture, not a lookup.**

A lookup returns one thing. This returns a weighted blend of everything that was ever stored, weighted by how much each item's cue overlaps with yours. Paris wins here because France's cue overlaps with itself completely and with the others only partly. When that stops being true, Paris stops winning. That is Beat 4.

**[LEARNER ACTION: press "Query: France" again, but with n2 weakened to 0.3 — a noisy cue. Readout: (1.04, 0.64, 0.64). Paris still wins, barely.]**

One more note on what the memory does and doesn't know. The words "France" and "Paris" never entered it. Two vectors were associated, and one was retrieved from the other. The meaning lives in the detectors that make the key and in the reader that names the column — not in the table.

---

## Beat 4 — The cost

### 4.1 — Where the mixture comes from

You have already seen the mechanism. Here it is written out for a general query. Suppose P associations have been stored, with keys **k**₁ … **k**_P and values **v**₁ … **v**_P, and you query with **k**_t — the exact key of item t.

$$\hat{\mathbf{v}} \;=\; \underbrace{\|\mathbf{k}_t\|^{2}\,\mathbf{v}_t}_{\text{what you wanted}} \;+\; \underbrace{\sum_{s \neq t} (\mathbf{k}_t \cdot \mathbf{k}_s)\,\mathbf{v}_s}_{\text{everything else}}$$

*In words:* you get the item you asked for, scaled by how strongly its own key matches itself — plus every other item, each scaled by how much its key resembles the one you used.

The second term is the leak. Two things make it bigger: more items (more terms in the sum), and more similar cues (bigger dot products in each term). The next two sliders are those two things.

### 4.2 — More items

**[Screen: switch from the hand-built example to random keys and values, so this is statistics rather than one story. Table width d = 64. Slider "stored items P" starts at 8. Readout shows, for each stored key, stored value beside retrieved value, and one number: fraction of items whose retrieved vector is closest to the correct stored value.]**

**[LEARNER ACTION: drag P from 8 to 128. Predict first: at what P does it start failing?]**

**[Screen, PRECOMPUTED curve with LIVE marker. Table of what the learner sees:]**

| stored items P | recall accuracy (d = 64) |
|---|---|
| 8 | 1.00 |
| 16 | 1.00 |
| 32 | 0.99 |
| 64 | 0.83 |
| 128 | 0.45 |

The knee is at P ≈ 64. That is not a coincidence; 64 is the width of the table.

### 4.3 — The law

For random keys of unit length in d dimensions, each cross term **k**_t · **k**_s is a random number with mean 0 and spread 1/√d. Summing P − 1 of them gives noise of size roughly √((P−1)/d). The signal is size 1. So:

$$\text{signal / noise} \;\approx\; \sqrt{\frac{d}{P-1}}$$

Signal equals noise when **P ≈ d**. Recall breaks when the number of stored items reaches the width of the table.

**[Screen: a small check panel, LIVE. Runs the toy at several (d, P) and prints the measured ratio beside the formula.]**

| d | P | measured | √(d/(P−1)) |
|---|---|---|---|
| 64 | 5 | 4.34 | 4.00 |
| 64 | 17 | 2.06 | 2.00 |
| 64 | 65 | 1.00 | 1.00 |
| 64 | 129 | 0.71 | 0.71 |
| 256 | 65 | 2.01 | 2.00 |

The formula is not a slogan. It is what the table you are looking at actually does.

**[LEARNER ACTION: slider "table width d": 32 → 64 → 128, at fixed P = 64. Watch accuracy: 0.53 → 0.83 → 0.98.]**

Wider table, more room, less leak. The lesson is the ratio P/d, not either number alone.

### 4.4 — Similar cues

**[LEARNER ACTION: reset P to 8, d to 64. Accuracy is 1.00. Now drag the slider "cue overlap" from 0 to 0.5. This makes every key share half its direction with a common component — the way France, Japan, and Germany all fired n1.]**

**[Screen: accuracy drops to 0.58 at P = 8. Push P to 32: 0.13.]**

Eight items in a 64-wide table. Far below capacity. And it already gets more than a third of them wrong — because the cross terms **k**_t · **k**_s are now large for every pair, so the leak is heavy even with few terms.

This is the more important of the two failures. Capacity is a ceiling you can see coming. Cue overlap is a trap: the table looks nearly empty and still can't answer.

**[Screen, LIVE: back to the France example. Slider adds shared neurons — 1, 2, 3, 4 shared detectors between the three countries. Paris's share of the readout: 50% → 43% → 40% → 38%. Paris still wins on argmax each time, but by less and less.]**

### 4.5 — Where the tokens went

Return to the question from Beat 1. We fixed the table's size. Then we stored 128 items in a 64-wide table. The table did not grow. So where are they?

**They are all still there, summed on top of each other.** Nothing was deleted. The table simply cannot hold 128 things separately in 64 columns, so it holds their sum, and the sum is what you get back when you ask for any one of them.

That is the cost of a memory that never grows. Not forgetting — **superposition.** The memory is not gone. It is blurred together with everything else.

---

## Beat 5 — BDH runs on this

Everything above was a toy: eight neurons, hand-assigned patterns, one table. Now the question you should be asking: does anything real work this way?

**[Screen: the phrase "Dragon Hatchling (BDH), Pathway, 2025" appears above the table. The table gets a new label: ρ.]**

### 5.1 — Attention as a table

You may have heard that language models use "attention." In its usual form, a token compares itself with every previous token, turns those comparisons into weights with a softmax, and takes a weighted sum of the previous tokens' values. As a formula: softmax(QKᵀ)V. Q is the current token's query, K the past keys, V the past values.

Now remove the softmax. What's left is (QKᵀ)V, and matrix multiplication lets you regroup it:

$$(QK^{\top})V \;=\; Q\,(K^{\top}V)$$

Look at the right-hand side. **KᵀV is a sum of outer products k_s v_sᵀ over past tokens.** It is a table, keyed by neuron, holding values. It is ρ. And Q(KᵀV) is a query multiplied against that table. It is the read.

Without a softmax, attention *is* the toy you just used. The softmax is what would have stopped this regrouping — it normalises over the past tokens, and you can't pull a normaliser out of the sum. Drop it, and comparing-against-every-token becomes reading-from-one-table.

### 5.2 — What the code does

This is not an interpretation we are imposing. It is what Pathway's reference implementation computes. From `bdh.py` (the official toy implementation linked in the problem statement), the attention is:

```python
scores = (QR @ KR.mT).tril(diagonal=-1)
return scores @ V
```

Three things to read off this, all of them checkable in the file:

- **No softmax.** `scores` is used raw. So the regrouping above applies.
- **`.tril(diagonal=-1)`** keeps strictly past tokens. A token reads the table before its own write lands.
- Just above this, the caller passes `Q=x_sparse, K=x_sparse, V=x`, and the attention function asserts `K is Q`. **Q and K are literally the same tensor.** There is no separate key projection. The pattern of neurons a token fires is both its query and its key. And **V is `x`**, the token's own residual vector — the value written into the table is the token's representation itself, not a separately learned "value."

In BDH terms: `x_sparse = ReLU(x @ encoder)` is the firing pattern — the key. `encoder` is a trained weight; it is the real version of the detectors we hand-assigned in Beat 3. About 5% of neurons fire per token in reported BDH runs, so the key is sparse, like ours.

**[Screen: a "Verify" button, LIVE. Runs the shipped parallel form `tril(QKᵀ)V` and the toy's step-by-step read/write loop on the same random input, and prints the largest difference between them.]**

```python
rho = zeros(n, d)
for t in range(T):
    out[t] = k[t] @ rho          # read (strictly past)
    rho   += outer(k[t], v[t])   # write
```

Result on our runs: **0.0** with rotary position encoding off; **1.1 × 10⁻¹⁶** with it on at the frequencies used for n = 8192. Floating-point noise. The toy's loop and BDH's attention line compute the same numbers. You can re-run this yourself.

### 5.3 — σ and ρ: two shapes for one memory

The BDH paper describes the memory as an n × n matrix called **σ**, where entry (i, j) is the strength of the synapse from neuron i to neuron j. That is the neuroscience picture: memory as connection strengths between neurons.

The code stores an n × d matrix, **ρ** — one row per neuron, d numbers per row, where d is the width of the residual vector. That is what you have been looking at.

These are **not the same matrix.** σ has n² entries; ρ has n·d, and n is much larger than d (8192 vs 256 in the reference config). Here is the relationship, and it is exact in our toy:

- Every write into the memory is an outer product **k vᵀ**, and **v** is only d-dimensional.
- So the n × n matrix σ, if you expand every written value into neuron space through a fixed d → n projection, is a sum of outer products whose right-hand sides all live in a d-dimensional subspace.
- Therefore **rank(σ) ≤ d**, and σ = ρ · E for that projection E.

**[Screen: a toggle, LIVE. Flips the table between its n × d form and its expanded n × n form. Prints: rank of the n × n form; "recovered from n × d?": true.]**

ρ is the compressed, lossless form. σ is the expanded form that reads as synapses. The paper gives the general relationship (its eq. 16), pairing the previous layer's output activations with the current layer's input activations and including a per-step rotation U^{t−τ} — which is what the rotary encoding in the code implements — and states that the two formulations are equivalent up to where the layer normalisations sit. We show the exact equality only for our toy; for the full model we cite the paper.

### 5.4 — What BDH gains

The paper is clear about why it accepts this design. In its own framing:

- **One fabric.** Memory and reasoning are the same operation. Reading the memory *is* the attention step. There is no separate memory module bolted onto a model.
- **Constant state.** The paper states BDH's working memory during inference relies entirely on synaptic plasticity with Hebbian learning. That memory is the table. It is n × d whether the input is 10 tokens or 100,000.
- **Inspectable state.** Because the memory lives on identifiable connections, you can ask what the model currently holds, not only what training baked into its weights. The paper reports finding individual synapses that strengthen for a specific concept across different prompts. (Note: the paper reports this at the level of *synapses* — pairs of neurons — not single neurons.)

### 5.5 — What BDH pays

The interference you produced in Beat 4. BDH does not remove it. Its reference attention has **no decay term and no forgetting term** — the table accumulates additively, exactly like the toy. The rotary encoding rotates old entries; it does not shrink them.

That is not a flaw we are pointing out from outside. It is the trade the architecture makes: constant memory in exchange for superposition.

### 5.6 — BDH-CQ: demonstrations as writes

BDH-CQ is a later system from the same family, built for tasks where a rule must be inferred from a few example pairs (ARC-style puzzles). The BDH-CQ paper describes two memories. One is a recurrent contextual state, updated as each demonstration is ingested, written as **Sₜ = U_θ(Sₜ₋₁, Dₜ)** — each demonstration Dₜ moves the state. The other is a latent workspace refined over several steps to answer the current query. The problem statement for this track notes the paper relates this contextual memory to attention, fast-weight, and linear-attention views, with the special case where state accumulates additively per demonstration. In that special case, each demonstration is a write into the table you have been using.

**[Screen, CITED: a bar chart from the BDH-CQ paper's controlled experiment.]**

The paper reports a binding test: each task defines a fresh colour permutation through its demonstrations, and the model must apply it to held-out inputs. As the number of simultaneous bindings rises from 2 to 8, the reported result is 24 out of 24 tasks solved at every level — 96 of 96 held-out outputs.

**[Screen: the toy's recall curve from Beat 4 drawn beside it.]**

Now read the two together carefully.

- BDH-CQ's published range stops at 8 bindings with no degradation.
- The toy, with a much smaller table, degrades eventually.
- **Where BDH-CQ's binding capacity saturates is not reported.** The experiment did not go far enough to find out.

**Evidence level.** This result is reported by the system's developers in their own paper. It is not an independent reproduction. We have not run BDH-CQ; its weights are not public.

---

## Beat 6 — Honest limits

**What this page demonstrated, live:** a fixed-size table stores associations by adding to existing rows; reading returns a mixture; the mixture degrades at P ≈ d; correlated cues break it far earlier; and the toy's arithmetic matches the attention line in BDH's reference code to floating-point precision.

**What this page cited and did not reproduce:** the ~5% sparsity figure, the synapse-level monosemanticity finding, the "hundreds of tokens" horizon, and the BDH-CQ binding result.

**Where the toy differs from BDH.** Be precise about this; it is the difference between an honest teaching model and a misleading one.

1. **Keys.** We assigned firing patterns by hand or at random. BDH computes them as `ReLU(x @ encoder)` from a trained weight matrix. Same role, different origin.
2. **Cue and item.** Our toy pairs a cue's key with a different item's value directly (France's neurons, Paris's code). In BDH, a token writes its *own* key with its *own* residual. Getting "cue → item" from that requires more than one layer: the paper's eq. 16 pairs the *previous* layer's output with the *current* layer's activation, and BDH runs six layers with shared weights. Our toy is one layer with the pairing done for it.
3. **Decode.** We decoded by nearest stored value. BDH passes the retrieved vector through a second projection, a ReLU, an elementwise gate against the token's own firing pattern, a decoder, and — after all layers — an output head. None of that is in the toy.
4. **Size and extras.** Eight neurons, not 8192. No layer normalisation, no attention heads, rotary encoding off by default (on, at realistic frequencies, it changes nothing in our example).

**What the toy simplifies away does not change the mechanism it teaches.** The write is an outer product; the read is a product against the table; the leak is the cross terms. That is true of BDH's attention, and the Verify button is the proof.

**Limits of the mechanism itself.**

- **Within-session memory is not learning.** The table is rebuilt from zero at the start of every sequence. Nothing written into it during a conversation changes any trained weight. Storing "France → Paris" in the table is not the same as the model knowing capitals.
- **The horizon.** The BDH paper places this memory at potentiation scales of minutes for the brain — up to hundreds of tokens. Constant-size state is claimed; unlimited faithful recall is not.
- **Consolidation is open.** The paper says that moving useful fast-weight state into durable long-term weights, at scales of 10³–10⁴ tokens, is not something it provides a direct answer to. That is the most important unresolved question behind everything on this page: the table fills, and there is no published mechanism for emptying it into the weights.

**A trap in how you measure.** In our first version of Beat 4, we used one-hot values and checked whether the largest entry of the retrieved vector was in the right position. Recall looked perfect at 256 items in a 32-wide table — because the correct item's self-term is always 1 and the noise never quite reaches it on any single coordinate. The interference was fully present and fully invisible. Switching to "is the retrieved vector closest to the correct stored value?" exposed it immediately.

**[Screen: a toggle between the two metrics on the same data, LIVE. Argmax: 1.00 across the board. Nearest-value: the curve from Beat 4.]**

If your metric can't see the failure, you will conclude the memory is fine. It is not fine. It is superposed.

---

## Sandbox

**[All controls unlocked: stored items, table width, cue overlap, metric toggle, σ/ρ toggle, Verify. The claim stays pinned.]**

Try to break the sentence at the top. If you can make a 64-wide table hold 500 items with perfect nearest-value recall, or make overlapping cues cost nothing, the claim is wrong and we want to know.

---

## What is live, what is not

| Component | Tag |
|---|---|
| Memory table, write, read, all sliders, both decode metrics | LIVE |
| Equivalence check against `bdh.py` attention | LIVE |
| σ/ρ toggle and rank check | LIVE |
| Recall curves across (P, d, overlap) | PRECOMPUTED — swept in Python, shipped as data; live marker overlays it |
| ~5% sparsity; synapse-level monosemanticity; "hundreds of tokens" | CITED — BDH paper |
| BDH-CQ 24/24 binding result | CITED — developer-reported, not independently reproduced |
| The toy itself | REIMPLEMENTATION — the two synaptic rounds only; not an official BDH model |

## Sources cited beside claims

- Kosowski, Uznański, Chorowski, Stamirowska, Bartoszkiewicz. *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain.* arXiv:2509.26507, 2025. — mechanism; eq. 16; sparsity; monosemanticity; horizon; consolidation as open.
- Pathway. *BDH-CQ* technical report. arXiv:2608.09888, 2026. — contextual state update; binding experiment.
- Pathway. `pathwaycom/bdh` reference implementation (`bdh.py`). — the attention lines quoted in 5.2.
- Behrouz, Zhong, Mirrokni. *Titans: Learning to Memorize at Test Time.* NeurIPS 2025. — the fixed-state vs growing-cache framing.
- Yang, Kautz, Hatamizadeh. *Gated Delta Networks.* ICLR 2025. — a delta-rule write with a forget gate: the engineering response to the interference shown here.
- Ellwood. *Short-term Hebbian learning can implement transformer-like attention.* bioRxiv 2023 / PLOS Computational Biology 2024. — independent support, from neuroscience, that transient potentiation can implement attention-like matching.
