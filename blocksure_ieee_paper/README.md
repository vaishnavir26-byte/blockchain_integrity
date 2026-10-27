# BlockSure IEEE Conference Paper (Overleaf Ready)

This directory contains the complete, corrected, and production-ready IEEE LaTeX source code for the research paper:

> **BlockSure: A Client-Side Privacy-Preserving Blockchain Architecture for File Integrity Verification, Append-Only Version Provenance, and Smart Contract-Enforced Update Authorization**

## Project Files
- `main.tex`: Full paper in IEEE Conference format (`IEEEtran.cls`), including self-contained vector TikZ and PGFPlots figures (no external PNGs/PDFs required).
- `references.bib`: BibTeX format references for reference management.

## Overleaf Quick Start Instructions
1. Open [Overleaf](https://www.overleaf.com/) and click **"New Project" > "Blank Project"**.
2. Name your project (e.g., `BlockSure_IEEE_Paper`).
3. Replace the contents of `main.tex` on Overleaf with the contents of this `main.tex`.
4. Click **"Recompile"**.
   - The paper will compile cleanly with 0 errors.
   - All five figures (Architecture diagram, Provenance Chain, Hashing Latency line plot, Gas Consumption bar chart, and Verification Latency bar chart) are rendered natively via TikZ/pgfplots.
