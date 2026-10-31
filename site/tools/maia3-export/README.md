# Maia-3 to ONNX (how the files in public/assets/engine/maia3-* were made)

Maia-3 is © CSSLab, University of Toronto, AGPL-3.0 (https://github.com/CSSLab/maia3).
These scripts and the converted models are shared under the same licence.

1. Download the checkpoints from Hugging Face: `UofTCSSLab/Maia3-ablate-3M/maia3-3m.pt`,
   `UofTCSSLab/Maia3-5M/maia3-5m.pt`, `UofTCSSLab/Maia3-23M/maia3-23m.pt`, `UofTCSSLab/Maia3-79M/maia3-79m.pt`
   into `/tmp/m3/dl/`.
2. `python3 export.py <3m|5m|23m|79m>` loads the weights only (`torch.load(weights_only=True)`) into
   `m3model.py`, our own copy of the model's forward pass, and writes `/tmp/m3/out/maia3-<size>.onnx`.
   The input is the current position only; the model repeats it for its 8-position history,
   as maia3's UCI engine does by default.
3. `python3 half.py in.onnx out.onnx` stores the weights as 16-bit floats with a cast back to
   32-bit at load: half the download, and the top move matched the 32-bit model in 300 of 300
   test positions for every size.
4. `node ../../scripts/split-engine.mjs out.onnx` cuts files over 24 MiB into parts.
