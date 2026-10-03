"""Build the CS-style arsenal (+ operator character) in Blender.

Usage (either works):
    blender -b -P blender/build.py -- [options]
    python3 blender/build.py [options]           # with the `bpy` pip module

Options:
    --only NAME[,NAME...]   build only these assets (e.g. Glock18,AK47)
    --render                render preview PNGs into renders/
    --samples N             Cycles samples for previews (default 96)
    --no-export             skip .glb export
    --out DIR               output root (default: repo root)
"""
import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import bpy  # noqa: E402

from blender.lib import core as C  # noqa: E402
from blender.lib import studio  # noqa: E402

WEAPONS = [
    ("Glock18", "blender.weapons.glock18"),
    ("P250", "blender.weapons.p250"),
    ("DesertEagle", "blender.weapons.deagle"),
    ("MP9", "blender.weapons.mp9"),
    ("MP5SD", "blender.weapons.mp5sd"),
    ("AK47", "blender.weapons.ak47"),
    ("M4A4", "blender.weapons.m4a4"),
    ("AWP", "blender.weapons.awp"),
]
CHARACTER = ("CT_Operator", "blender.character.operator")


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument("--only", default="")
    p.add_argument("--render", action="store_true")
    p.add_argument("--samples", type=int, default=96)
    p.add_argument("--no-export", action="store_true")
    p.add_argument("--out", default=os.path.dirname(HERE))
    return p.parse_args(argv)


def export_glb(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [root] + list(root.children_recursive):
        obj.hide_set(False)
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True)


def main():
    args = parse_args()
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    out_models = os.path.join(args.out, "models")
    out_renders = os.path.join(args.out, "renders")
    os.makedirs(os.path.join(out_models, "glb"), exist_ok=True)
    os.makedirs(out_renders, exist_ok=True)

    C.reset_scene()
    scene = bpy.context.scene
    weapons_coll = bpy.data.collections.new("Weapons")
    scene.collection.children.link(weapons_coll)

    roots = {}
    for name, mod_name in WEAPONS:
        if only and name not in only:
            continue
        mod = importlib.import_module(mod_name)
        root = mod.build()
        weapons_coll.children.link(root.users_collection[0])
        scene.collection.children.unlink(root.users_collection[0])
        roots[name] = root
        print("built", name, len(root.children), "parts")

    char_root = None
    if not only or CHARACTER[0] in only:
        mod = importlib.import_module(CHARACTER[1])
        char_root = mod.build()
        roots[CHARACTER[0]] = char_root
        print("built", CHARACTER[0])

    # Lay weapons out on a display grid (each asset is modelled at the origin).
    y = 0.0
    for name, _ in WEAPONS:
        if name in roots:
            roots[name].location = (0.0, y, 0.0)
            y += 0.35
    if char_root is not None:
        char_root.location = (-1.5, 0.0, 0.0)

    bpy.context.view_layer.update()

    if not args.no_export:
        for name, root in roots.items():
            loc = root.location.copy()
            root.location = (0, 0, 0)
            bpy.context.view_layer.update()
            export_glb(root, os.path.join(out_models, "glb", name + ".glb"))
            root.location = loc

    if args.render:
        studio.setup_render(scene, args.samples)
        for name, root in roots.items():
            studio.render_asset(scene, root, list(roots.values()), os.path.join(out_renders, name + ".png"))
        if len(roots) > 1:
            weapon_roots = [r for n, r in roots.items() if n != CHARACTER[0]]
            if weapon_roots:
                studio.render_lineup(scene, weapon_roots, list(roots.values()),
                                     os.path.join(out_renders, "lineup.png"))

    # Clean viewport state: show everything, drop render-only helpers.
    studio.cleanup(scene)
    for r in roots.values():
        for o in [r] + list(r.children_recursive):
            o.hide_render = False
            o.hide_set(False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_models, "cs_arsenal.blend"), compress=True)
    print("saved", os.path.join(out_models, "cs_arsenal.blend"))


if __name__ == "__main__":
    main()
