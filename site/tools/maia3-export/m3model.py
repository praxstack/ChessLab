# Own re-implementation of the Maia-3 (Chessformer) forward pass, written from
# reading CSSLab/maia3 models.py (AGPL-3.0). Only weights are loaded.
import math, torch, torch.nn as nn, torch.nn.functional as F

EPS_RMS = torch.finfo(torch.float32).eps

class Block(nn.Module):
    def __init__(s, d, h, ff, gab_mid, gen, per_sq=0):
        super().__init__()
        s.h, s.gen, s.per_sq = h, gen, per_sq
        s.sm1 = nn.Linear(d, per_sq) if per_sq else None
        s.in_proj = nn.Parameter(torch.empty(3 * d, d))
        s.out_proj = nn.Parameter(torch.empty(d, d))
        s.sm2 = nn.Linear(64 * per_sq if per_sq else d, gab_mid); s.ln1 = nn.LayerNorm(gab_mid)
        s.sm3 = nn.Linear(gab_mid, h * gen); s.ln2 = nn.LayerNorm(h * gen)
        s.linear1 = nn.Linear(d, ff); s.linear2 = nn.Linear(ff, d)
        s.norm1 = nn.Parameter(torch.ones(d)); s.norm2 = nn.Parameter(torch.ones(d))
    @staticmethod
    def rms(x, w):
        return x * torch.rsqrt((x * x).mean(-1, keepdim=True) + EPS_RMS) * w
    def forward(s, x, gab_w):
        B, T, D = x.shape
        y = F.gelu(s.sm2(s.sm1(x).reshape(B, -1) if s.sm1 is not None else x.mean(1)))
        y = s.ln1(y)
        y = F.gelu(s.sm3(y))
        y = s.ln2(y).view(B, s.h, s.gen)
        bias = torch.matmul(y, gab_w.t()).view(B, s.h, 64, 64)
        qkv = F.linear(x, s.in_proj)
        q, k, v = qkv.split(D, -1)
        hd = D // s.h
        q = q.view(B, T, s.h, hd).transpose(1, 2)
        k = k.view(B, T, s.h, hd).transpose(1, 2)
        v = v.view(B, T, s.h, hd).transpose(1, 2)
        att = torch.softmax(q @ k.transpose(-1, -2) / math.sqrt(hd) + bias, -1)
        o = (att @ v).transpose(1, 2).reshape(B, T, D)
        x = s.rms(x + F.linear(o, s.out_proj), s.norm1)
        x = s.rms(x + s.linear2(F.gelu(s.linear1(x))), s.norm2)
        return x

class Maia3(nn.Module):
    def __init__(s, dim_vit, heads, head_hid, blocks=8, dim_emb=128, history=8, gen=64, gab_mid=64, per_sq=0):
        super().__init__()
        s.history, s.head_hid = history, head_hid
        s.elo_low = nn.Parameter(torch.empty(dim_emb)); s.elo_high = nn.Parameter(torch.empty(dim_emb))
        s.token_projection = nn.Linear(12 * history + 2 * dim_emb, dim_vit)
        s.gab = nn.Parameter(torch.empty(4096, gen))
        s.blocks = nn.ModuleList([Block(dim_vit, heads, int(dim_vit * 2), gab_mid, gen, per_sq) for _ in range(blocks)])
        s.tnorm = nn.LayerNorm(dim_vit); s.last_ln = nn.LayerNorm(dim_vit)
        s.fc_value_hid = nn.Linear(dim_vit, head_hid); s.fc_value = nn.Linear(head_hid, 3)
        s.proj_sq_from = nn.Linear(dim_vit, head_hid, bias=False); s.proj_sq_to = nn.Linear(dim_vit, head_hid, bias=False)
        s.promo = nn.Linear(head_hid, 4, bias=False)
    def elo(s, e):
        w = (e.clamp(0, 5000) / 5000).unsqueeze(1)
        return w * s.elo_low + (1 - w) * s.elo_high
    def forward(s, board, elo_self, elo_oppo):
        # board: (B, 64, 12), the current position from the mover's side; history = it, repeated.
        B = board.shape[0]
        tokens = board.repeat(1, 1, s.history)
        es = s.elo(elo_self).unsqueeze(1).expand(B, 64, -1)
        eo = s.elo(elo_oppo).unsqueeze(1).expand(B, 64, -1)
        x = s.token_projection(torch.cat([tokens, es, eo], -1))
        for b in s.blocks: x = b(x, s.gab)
        x = s.tnorm(x)
        f = s.proj_sq_from(x); t = s.proj_sq_to(x)
        base = f @ t.transpose(1, 2) / math.sqrt(s.head_hid)  # (B, 64 from, 64 to)
        promo = s.promo(t[:, 56:64, :]) * math.sqrt(s.head_hid)  # (B, 8 to-file, 4)
        r7r8 = base[:, 48:56, 56:64]  # (B, 8 from-file, 8 to-file)
        promos = (r7r8.unsqueeze(-1) + promo.unsqueeze(1)).reshape(B, 256)  # from-file, to-file, q r b n
        policy = torch.cat([base.reshape(B, 4096), promos], 1)
        v = s.last_ln(x.mean(1))
        value = s.fc_value(F.relu(s.fc_value_hid(v)))  # loss, draw, win for the mover
        return policy, value

SIZES = {  # from CSSLab/maia3 model_registry.py
    '3m': dict(dim_vit=192, heads=6, head_hid=192),
    '5m': dict(dim_vit=256, heads=8, head_hid=256),
    '23m': dict(dim_vit=512, heads=16, head_hid=512, gen=128, gab_mid=128, per_sq=32),
    '79m': dict(dim_vit=1024, heads=32, head_hid=1024, gen=128, gab_mid=128, per_sq=32),
}

def load(path, size):
    sd = torch.load(path, map_location='cpu', weights_only=True)
    sd = sd.get('model_state_dict', sd)
    m = Maia3(**SIZES[size])
    out = {'elo_low': sd['elo_embedding_low.weight'][0], 'elo_high': sd['elo_embedding_high.weight'][0],
           'gab': sd['smolgen_shared_weight'] if 'smolgen_shared_weight' in sd else sd['gab_shared_weight'],
           'tnorm.weight': sd['transformer.norm.weight'], 'tnorm.bias': sd['transformer.norm.bias'],
           'promo.weight': sd['promo_bias_proj.weight']}
    used = {'elo_embedding_low.weight', 'elo_embedding_high.weight', 'smolgen_shared_weight', 'gab_shared_weight', 'transformer.norm.weight', 'transformer.norm.bias', 'promo_bias_proj.weight'}
    for k, v in sd.items():
        if k in used: continue
        if k.startswith('transformer.layers.'):
            i, rest = k[len('transformer.layers.'):].split('.', 1)
            rest = rest.replace('self_attn.mha.in_proj_weight', 'in_proj').replace('self_attn.mha.out_proj.weight', 'out_proj')
            rest = rest.replace('self_attn.', '').replace('norm1.weight', 'norm1').replace('norm2.weight', 'norm2')
            if rest.endswith('smolgen_weight') or rest.endswith('gab_weight'):
                assert torch.equal(v, out['gab']), 'per-layer GAB weight differs from the shared one'
                used.add(k); continue
            out[f'blocks.{i}.{rest}'] = v
        elif k.startswith('fc_ponder'):
            continue  # time head, not used
        else:
            out[k] = v
        used.add(k)
    missing, unexpected = m.load_state_dict(out, strict=True), None
    m.eval()
    return m
