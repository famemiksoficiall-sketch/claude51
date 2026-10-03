"""AI AWP (.338 Lapua bolt-action sniper). Length ~1230 mm, bore at z = 150."""
import math

from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "AWP"
BZ = 150.0


def build():
    root = C.begin_asset(NAME)
    olive = M.polymer_green()
    grip_olive = M.grip_green()
    steel = M.blued()
    bright = M.steel()
    dark = M.gunmetal()

    # --- Receiver (steel) ---
    rec = C.xsec("Receiver", C.round_top_xsec(19.0, 118, 178, 12.0, n=8), 0, 290, steel, bevel=0.6)
    C.boolean(rec, C.cutter_boxes([(120, 200, -30, -5, 150, 190)]))  # ejection port (right)
    C.cyl("BoltBody", 9.5, -2, 280, bright, z=BZ + 2, segs=28, bevel=0.4)
    C.cyl("BoltShroud", 11.5, -40, -2, steel, z=BZ + 2, segs=28, bevel=0.5)
    C.lathe("BoltHandleShaft", [(0, 0), (0, 4.5), (46, 4.5), (46, 0)], bright, loc=(150, -9, BZ + 2),
            rot=(0, 0, -62), segs=16)
    C.lathe("BoltKnob", [(0, 0), (0, 3), (3, 8), (12, 12.5), (26, 12.5), (36, 8), (38, 0)], bright,
            loc=(150 + 0, -9 - 46 * math.sin(math.radians(62)) * 1.0, BZ + 2 - 0), rot=(0, 0, -62), segs=24)
    C.profile("Safety", [(-30, 178), (-4, 178), (-4, 184), (-30, 184)], 8.0, bright, y=10.0, bevel=0.5)
    # scope mount rail on top
    P.picatinny("ScopeRail", 20, 270, 178, steel, width=21.2, base_h=3.0, tooth_h=3.0, pitch=12.0)
    for x in (80, 200):
        P.scope_ring("Ring%d" % x, x, 187, 187 + 30 - 4, 32.0, dark, width=30.0)

    # --- Scope (Leupold-style 10x) ---
    P.scope("Scope", -40, 420, 217 - 2, tube_r=15.0, obj_r=27.0, eye_r=22.0, body=M.polymer_black())

    # --- Barrel + muzzle brake ---
    C.lathe("Barrel", [(0, 0), (0, 14), (60, 13.5), (220, 12.5), (560, 10.2), (570, 0)], steel,
            loc=(290, 0, BZ), segs=48)
    C.lathe("Fluting", [(0, 0), (0, 14.4), (90, 14.4), (90, 0)], steel, loc=(310, 0, BZ), segs=48)
    brake = C.lathe("MuzzleBrake", [(0, 7), (0, 14.5), (4, 15.5), (90, 15.5), (94, 13), (94, 7)], dark,
                    loc=(846, 0, BZ), closed=True, segs=40)
    C.boolean(brake, [C.cutter_boxes([(858 + i * 14, 865 + i * 14, -30, 30, BZ - 4, BZ + 4)]) for i in range(4)])
    P.muzzle_bore("Bore", 939.9, 7.0, BZ, depth=40)
    C.lathe("BrakeNut", [(0, 0), (0, 15), (5, 15), (5, 0)], bright, loc=(842, 0, BZ), segs=6)

    # --- Chassis: Accuracy International-style polymer stock ---
    body = C.profile("StockFront", [(60, 130), (60, 112), (120, 98), (280, 86), (420, 84), (560, 94), (560, 112),
                                    (420, 118), (330, 130), (290, 130)], 40.0, olive, bevel=2.8, segs=3)
    fore = C.profile("Forend", [(290, 124), (520, 116), (700, 118), (700, 100), (520, 96), (280, 86)], 34.0, olive,
                     bevel=2.8, segs=3)
    C.boolean(fore, C.cutter_boxes([(360, 420, -30, 30, 100, 124)]))  # ventilation slot
    fore["sharp"] = 40.0
    C.box("ForendRail", 480, 690, -2.5, 2.5, 80, 98, olive, bevel=0.8)
    # bipod
    C.cyl("BipodMount", 6, 0, 24, dark, y=-12, z=82, rot=(0, 0, -90), segs=20).location.x = 0.600
    for s in (-1, 1):
        C.profile("BipodLeg%s" % ("L" if s > 0 else "R"), [(590, 82), (598, 82), (610, -60), (602, -62)], 5.0, dark,
                  y=s * 22, bevel=0.6)
    # spine / rear section + thumbhole grip
    spine = C.profile("Spine", [(-4, 178), (-4, 126), (60, 130), (60, 178)], 36.0, olive, bevel=2.5)
    ch = C.profile("Chassis", [(-4, 126), (80, 126), (110, 112), (112, 104), (60, 96), (-4, 100)], 44.0, olive,
                   bevel=2.5, segs=3)
    front = C.bumpy_line((98, 108), (80, 20), 3, 1.6, side=-1.0)
    C.profile("PistolGrip", [(150, 112), (98, 108)] + front + [(78, 14), (40, 10), (30, 18), (42, 60), (60, 100),
                                                                (140, 114)], 36.0, grip_olive, bevel=3.0, segs=3)
    P.trigger_guard("TriggerGuard", 172, 118, 108, 66, 4.0, 10.0, olive, front_r=14, rear_r=8)
    P.trigger("Trigger", 138, 108, 24, bright, curve=6.0, thick=5.0)
    # magazine (10 rd, polymer, single stack-ish)
    C.profile("Magazine", [(172, 112), (236, 112), (236, 40), (222, 18), (176, 18)], 34.0, M.polymer_black(),
              bevel=2.0)
    C.box("MagRelease", 178, 188, -17, 17, 112, 120, olive, bevel=0.8)

    # buttstock with cheek riser and adjustable pad
    stock = C.profile("Buttstock", [(-4, 178), (-40, 178), (-340, 176), (-360, 160), (-368, 68), (-330, 60),
                                    (-150, 82), (-4, 100)], 38.0, olive, bevel=3.0, segs=3)
    C.boolean(stock, C.cutter_boxes([(-300, -120, -30, -15, 90, 160)]))
    C.box("CheekRiser", -310, -70, -22, 22, 176, 192, olive, bevel=3.0)
    for x in (-250, -190, -130):
        C.cyl("RiserRod%d" % x, 3.5, x, x + 1.0, bright, z=176, rot=(0, 90, 0), segs=12)
    C.profile("ButtPad", [(-360, 164), (-380, 160), (-392, 72), (-374, 62), (-366, 66)], 42.0, M.rubber(),
              bevel=2.5)
    C.cyl("SpacerRod", 5, 0, 24, bright, y=0, z=110, rot=(0, 0, 0), segs=16).location.x = -0.350
    for s in (-1, 1):
        P.screw_head("ReceiverScrew%d" % (s > 0), 60, s * 19.1, 140, 3.0, bright)
        P.screw_head("ReceiverScrewB%d" % (s > 0), 220, s * 19.1, 140, 3.0, bright)
    C.torus("SlingStud", 8, 1.8, (680, 0, 80), bright, rot=(0, 90, 0))
    return C.end_asset()
