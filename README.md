# claude51 — CS-style arsenal in Blender

Procedurally modelled 3D assets (Python/`bpy`, Blender 4.2): a CT operator
character and 8 weapons — Glock-18, P250, Desert Eagle, MP9, MP5-SD, AK-47,
M4A4, AWP.

- `models/cs_arsenal.blend` — everything in one scene (open in Blender)
- `models/glb/*.glb` — one file per asset (units: metres, +X = muzzle direction)
- `renders/` — Cycles previews, `lineup.png` is the overview

Rebuild: `pip install bpy==4.2.0 "numpy<2"` then
`python3 blender/build.py --render` (`--only AK47,AWP` for a subset).
Source: `blender/lib` (helpers, materials, studio), `blender/weapons`, `blender/character`.
