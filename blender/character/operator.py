"""CT operator: a detailed, stylised tactical-soldier character, 1.80 m tall.

Built from tapered/rounded limb segments, a plate-carrier vest with MOLLE
rows and pouches, helmet with NVG mount, goggles, gloves, kneepads, boots,
and a sidearm holster. Posed in a relaxed A-pose, facing +X (like the guns).
Units: mm in builder helpers (feet at z=0).
"""
import math

import bmesh
import bpy
from mathutils import Vector

from ..lib import core as C
from ..lib import materials as MT
from ..lib.materials import M

NAME = "CT_Operator"
MM = C.MM


def _limb(name, p0, p1, r0, r1, mat, segs=20, bevel=0.0, squash=1.0):
    """Tapered capsule-ish limb between two 3D points (mm)."""
    a, b = Vector(p0), Vector(p1)
    d = b - a
    L = d.length
    bm = bmesh.new()
    rings = 10
    for i in range(rings + 1):
        t = i / rings
        # slight belly in the middle for muscle look
        r = r0 + (r1 - r0) * t + math.sin(math.pi * t) * (r0 + r1) * 0.06
        for j in range(segs):
            ang = 2 * math.pi * j / segs
            bm.verts.new((L * t * MM, r * math.cos(ang) * MM, r * math.sin(ang) * squash * MM))
    bm.verts.ensure_lookup_table()
    for i in range(rings):
        for j in range(segs):
            j2 = (j + 1) % segs
            bm.faces.new((bm.verts[i * segs + j], bm.verts[i * segs + j2],
                          bm.verts[(i + 1) * segs + j2], bm.verts[(i + 1) * segs + j]))
    cap0 = bm.faces.new([bm.verts[j] for j in range(segs)][::-1])
    cap1 = bm.faces.new([bm.verts[rings * segs + j] for j in range(segs)])
    bmesh.ops.poke(bm, faces=[cap0, cap1], offset=-0.0)
    obj = C._finish(name, bm, mat, bevel, 1)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((1, 0, 0)).rotation_difference(d.normalized())
    obj.location = a * MM
    obj["sharp"] = 80.0
    return obj


def _ball(name, c, r, mat, scale=(1, 1, 1)):
    return C.sphere(name, r, c, mat, scale=scale, segs=32, rings=20)


def build():
    root = C.begin_asset(NAME)
    uniform = MT.fabric("CamoNavy", (0.10, 0.13, 0.22))
    vest_mat = MT.fabric("VestGrey", (0.17, 0.19, 0.2), rough=0.8)
    skin = MT.polymer("Skin", (0.62, 0.43, 0.33), 0.55)
    glove = MT.fabric("Glove", (0.03, 0.03, 0.035), rough=0.6)
    boot = MT.polymer("Boot", (0.05, 0.04, 0.035), 0.5)
    helmet_mat = MT.polymer("Helmet", (0.09, 0.12, 0.2), 0.45)
    pad = M.rubber()
    steel = M.gunmetal()

    # ---- Legs (feet at z=0, character centred on y=0, facing +X) ----
    for s, side in ((1, "L"), (-1, "R")):
        y = s * 105
        _limb("Thigh" + side, (0, y, 880), (10, y, 480), 98, 70, uniform, squash=1.0)
        _limb("Calf" + side, (10, y, 470), (-10, y, 130), 68, 52, uniform)
        _ball("Knee" + side, (14, y, 475), 70, uniform)
        # kneepad
        C.box("KneePad" + side, 40, 100, y - 55, y + 55, 430, 540, pad, bevel=12, segs=3)
        # boot
        bt = C.profile("Boot" + side, [(-70, 160), (60, 160), (68, 90), (130, 60), (190, 30), (190, 0), (-75, 0),
                                       (-80, 40)], 125.0, boot, y=y, bevel=10, segs=3)
        C.box("BootSole" + side, -80, 196, y - 66, y + 66, -6, 28, pad, bevel=6, segs=2)
        for k in range(6):
            C.box("BootLace%s%d" % (side, k), 70 - k * 8 + 24, 80 - k * 8 + 24, y - 30, y + 30, 92 + k * 10, 98 + k * 10,
                  steel, bevel=0.0)
        # trouser cuff gathering
        C.tube("Cuff" + side, 50, 62, -20, 40, uniform, y=y, z=160, segs=24, rot=(0, 90, 0))
        # tactical thigh pocket
        C.box("CargoPocket" + side, 40, 100, y + s * 78 - 12, y + s * 78 + 12, 560, 740, uniform, bevel=5, segs=2)

    # ---- Pelvis / belt ----
    C.box("Pelvis", -95, 110, -165, 165, 840, 980, uniform, bevel=40, segs=4)
    C.box("Belt", -100, 115, -168, 168, 960, 1020, vest_mat, bevel=8, segs=2)
    C.box("BeltBuckle", 112, 122, -22, 22, 968, 1010, steel, bevel=3)
    # holster on right thigh
    hol = C.profile("Holster", [(55, 940), (115, 940), (120, 800), (110, 720), (60, 720), (50, 800)], 46.0,
                    glove, y=-195, bevel=6, segs=2)
    C.box("HolsterStrap", 55, 118, -222, -170, 930, 950, glove, bevel=2)
    C.profile("PistolGrip", [(60, 960), (70, 1000), (110, 1000), (100, 950)], 30.0, M.polymer_black(), y=-195, bevel=3)

    # ---- Torso ----
    _limb("Torso", (0, 0, 980), (0, 0, 1380), 160, 180, uniform, squash=0.72)
    C.box("Chest", -75, 95, -190, 190, 1250, 1450, uniform, bevel=55, segs=4)
    _ball("SternumFill", (10, 0, 1330), 110, uniform, scale=(0.9, 1.4, 1.0))
    for s in (-1, 1):
        _ball("Shoulder%d" % (s > 0), (0, s * 215, 1440), 86, uniform)
    C.box("Neck", -35, 45, -48, 48, 1440, 1530, skin, bevel=18, segs=3)
    _limb("NeckBase", (5, 0, 1440), (5, 0, 1540), 62, 52, skin)

    # ---- Plate carrier vest ----
    vest = C.xsec("VestBody", C.rrect(-190, 190, 1000, 1470, 60, 6), 70, 130, vest_mat, bevel=8, segs=3)
    # front/back plates by cross-extrusion in x so the vest wraps the torso
    C.box("VestFront", 88, 142, -170, 170, 1060, 1450, vest_mat, bevel=22, segs=3)
    C.box("VestBack", -128, -66, -170, 170, 1060, 1450, vest_mat, bevel=22, segs=3)
    for s in (-1, 1):
        C.box("VestStrap%d" % (s > 0), -80, 95, s * 140 - 22, s * 140 + 22, 1440, 1500, vest_mat, bevel=10, segs=2)
        C.box("Cummerbund%d" % (s > 0), -75, 90, s * 190 - 8, s * 190 + 8, 1010, 1330, vest_mat, bevel=4)
    # MOLLE webbing rows (front)
    rows = []
    for r in range(8):
        z = 1080 + r * 36
        for c in range(9):
            y = -120 + c * 30
            rows.append((143, 146, y - 11, y + 11, z, z + 8))
    C.boxes("MolleFront", rows, MT.fabric("Webbing", (0.1, 0.11, 0.12)), bevel=0.4)
    # magazine pouches (3 x 5.56 mags)
    for i in range(3):
        y = -70 + i * 70
        C.box("MagPouch%d" % i, 146, 192, y - 30, y + 30, 1060, 1180, uniform, bevel=8, segs=2)
        C.box("MagPouchFlap%d" % i, 190, 194, y - 28, y + 28, 1150, 1190, uniform, bevel=3)
        C.box("MagTop%d" % i, 150, 178, y - 22, y + 22, 1180, 1215, M.polymer_black(), bevel=4)
    # radio + chest rig details
    C.box("RadioPouch", 146, 178, 100, 160, 1250, 1360, uniform, bevel=8, segs=2)
    C.lathe("RadioAntenna", [(0, 0), (0, 4), (110, 3), (110, 0)], steel, loc=(160, 135, 1360), rot=(0, -90, 0), segs=8)
    C.box("AdminPouch", 146, 168, -160, -100, 1260, 1360, uniform, bevel=6, segs=2)
    # grab handle on back
    C.torus("DragHandle", 36, 5, (-150, 0, 1470), vest_mat, rot=(0, 90, 0))
    # hydration pack on back
    C.box("BackPack", -190, -128, -120, 120, 1090, 1420, uniform, bevel=30, segs=3)

    # ---- Arms (A-pose, hands forward holding lightly) ----
    for s, side in ((1, "L"), (-1, "R")):
        sh = (0, s * 225, 1440)
        el = (30, s * 330, 1180)
        wr = (140, s * 270, 950)
        _limb("UpperArm" + side, sh, el, 66, 52, uniform)
        _ball("Elbow" + side, el, 55, uniform)
        C.box("ElbowPad" + side, el[0] - 40, el[0] + 5, el[1] - 40, el[1] + 40, el[2] - 40, el[2] + 40, pad, bevel=8,
              segs=2)
        _limb("Forearm" + side, el, wr, 52, 40, uniform)
        # glove + hand
        _limb("Hand" + side, wr, (wr[0] + 70, wr[1] - s * 10, wr[2] - 50), 38, 30, glove, squash=0.6)
        for f in range(4):
            off = (f - 1.5) * 15
            _limb("Finger%s%d" % (side, f), (wr[0] + 62, wr[1] - s * 10 + off, wr[2] - 40),
                  (wr[0] + 110, wr[1] - s * 10 + off, wr[2] - 85), 8.5, 7, glove, segs=10)
        _limb("Thumb" + side, (wr[0] + 28, wr[1] - s * 38, wr[2] - 5), (wr[0] + 70, wr[1] - s * 40, wr[2] - 35),
              10, 8, glove, segs=10)

    # ---- Head ----
    _ball("Head", (15, 0, 1640), 90, skin, scale=(1.05, 0.9, 1.22))
    for s in (-1, 1):
        _ball("Ear%d" % (s > 0), (5, s * 82, 1635), 18, skin, scale=(0.5, 0.5, 1.0))
        _ball("Eye%d" % (s > 0), (95, s * 32, 1655), 7, M.white_paint(), scale=(0.6, 1, 0.7))
        _ball("Pupil%d" % (s > 0), (100, s * 32, 1655), 3.8, steel, scale=(0.5, 1, 1))
        C.box("Brow%d" % (s > 0), 90, 100, s * 32 - 20, s * 32 + 20, 1672, 1680, MT.polymer("Hair", (0.1, 0.07, 0.05), 0.7),
              bevel=2)
    _ball("Nose", (112, 0, 1625), 15, skin, scale=(1.4, 0.8, 1.2))
    C.box("Mouth", 100, 106, -26, 26, 1580, 1586, MT.polymer("Lips", (0.45, 0.25, 0.22), 0.5), bevel=1)
    C.box("Jaw", 70, 100, -55, 55, 1555, 1590, skin, bevel=14, segs=3)

    # ---- Helmet (MICH/OpsCore style) with rails, NVG mount and goggles ----
    dome = _ball("HelmetShell", (10, 0, 1660), 118, helmet_mat, scale=(1.15, 1.0, 0.86))
    C.boolean(dome, C.cutter_boxes([(-200, 200, -200, 200, 1400, 1600)]))
    # brim / side cutouts for ears
    for s in (-1, 1):
        C.box("RailArm%d" % (s > 0), -20, 70, s * 128 - 6, s * 128 + 6, 1630, 1690, steel, bevel=2)
    C.box("NVGMount", 108, 134, -28, 28, 1700, 1740, steel, bevel=3)
    C.box("HelmetStrap", 20, 40, -80, 80, 1540, 1556, glove, bevel=1)
    C.box("ChinStrap", 30, 100, -60, 60, 1560, 1570, glove, bevel=1)
    # goggles on forehead
    C.box("GoggleBand", -90, 110, -118, 118, 1706, 1730, glove, bevel=6, segs=2)
    for s in (-1, 1):
        C.box("GoggleLens%d" % (s > 0), 112, 132, s * 52 - 40, s * 52 + 40, 1690, 1740,
              M.lens(), bevel=8, segs=3)
    C.box("GoggleBridge", 118, 134, -14, 14, 1710, 1730, steel, bevel=3)
    # ear-protection comms
    for s in (-1, 1):
        C.cyl("Comms%d" % (s > 0), 40, 0, 20, steel, y=s * 100, z=1650, rot=(0, 0, 90 * s), segs=24, bevel=4)

    return C.end_asset()
