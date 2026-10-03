"""AK-47 (Type 3 milled-style look, 7.62x39). Length ~880 mm, bore at z = 150."""
import math

from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "AK47"
BZ = 150.0


def build():
    root = C.begin_asset(NAME)
    metal = M.blued()
    steel = M.steel()
    wood = M.ak_wood()
    bake = M.bakelite()

    # --- Receiver (stamped body with trunnion) ---
    hw = 18.0
    rec = C.xsec("Receiver", C.round_top_xsec(hw, 110, 176, 8.0, n=6), 0, 300, metal, bevel=0.6)
    C.boolean(rec, C.cutter_boxes([(120, 200, -30, -6, 140, 170)]))
    for s in (-1, 1):
        y0, y1 = (hw - 0.7, hw + 4) if s > 0 else (-hw - 4, -hw + 0.7)
        C.boolean(rec, C.cutter_boxes([(10, 290, y0, y1, 136, 139), (20, 290, y0, y1, 118, 120)]))
    C.box("BoltCarrier", 121, 199, -12, 12, 138, 172, steel, bevel=0.8)
    C.box("ChargingHandle", 150, 168, -30, -12, 150, 158, steel, bevel=0.6)
    C.cyl("ChargingKnob", 6, 150, 168, steel, y=-30, z=154, rot=(0, 0, -90), segs=16)
    C.box("DustCover", 4, 116, -17.5, 17.5, 172, 177, metal, bevel=1.2)
    # trunnion block and rear sight base
    C.box("Trunnion", 290, 330, -17.5, 17.5, 124, 172, metal, bevel=1.2)
    C.box("RearSightBlock", 200, 244, -14, 14, 176, 186, metal, bevel=0.8)
    leaf = C.profile("RearSightLeaf", [(204, 186), (284, 186), (284, 194), (230, 196), (204, 190)], 18.0, steel,
                     bevel=0.5)
    C.boolean(leaf, C.cutter_boxes([(262, 276, -2, 2, 184, 200)]))
    C.box("RearSightSlider", 258, 280, -9, 9, 190, 200, steel, bevel=0.5)

    # --- Gas block, barrel, handguards, muzzle ---
    C.lathe("Barrel", [(0, 0), (0, 10), (480, 10), (480, 0)], steel, loc=(300, 0, BZ), segs=32)
    C.lathe("GasBlock", [(0, 0), (0, 14), (50, 14), (50, 0)], metal, loc=(500, 0, BZ + 7), segs=24)
    C.lathe("FrontSightBlock", [(0, 0), (0, 15), (40, 15), (40, 0)], metal, loc=(640, 0, BZ), segs=24)
    C.box("FrontSightPost", 660, 664, -1.5, 1.5, 164, 198, metal, bevel=0.4)
    C.tube("SightHood", 11, 13, 650, 672, metal, z=BZ + 32, segs=24, rot=None)
    C.lathe("GasTube", [(0, 0), (0, 10), (200, 10), (200, 0)], metal, loc=(330, 0, BZ + 26), segs=24)
    muzzle = C.lathe("MuzzleBrake", [(0, 7), (0, 15), (8, 16), (60, 16), (64, 13), (64, 7)], metal,
                     loc=(740, 0, BZ), closed=True, segs=40)
    C.boolean(muzzle, C.cutter_boxes([(758, 774, -30, 30, BZ - 3, BZ + 3)]))
    C.lathe("Nut", [(0, 0), (0, 12), (6, 12), (6, 0)], steel, loc=(738, 0, BZ), segs=6)
    P.muzzle_bore("Bore", 803.9, 7.0, BZ, depth=40)

    # lower + upper handguards (walnut)
    lo = C.xsec("HandguardLower", C.round_top_xsec(25, 112, 160, 20, n=8), 330, 500, wood, bevel=1.5)
    C.boolean(lo, C.cutter_boxes([(334, 496, -4, 4, 150, 170)]))
    C.boolean(lo, C.cutter_boxes([(342 + i * 22, 346 + i * 22, -40, -23, 112, 118) for i in range(7)]))
    up = C.xsec("HandguardUpper", C.round_top_xsec(21, 160, 190, 10, n=6), 330, 520, wood, bevel=1.2)
    C.boolean(up, C.cutter_cyl(11, 320, 530, z=BZ + 0.001))
    C.box("HandguardRetainer", 520, 530, -19, 19, 128, 188, steel, bevel=0.6)
    C.box("FrontFerrule", 326, 332, -26, 26, 110, 190, metal, bevel=0.6)
    C.xsec("HandguardHeatShield", C.chamfer_xsec(24, 188, 192, 1.5), 336, 514, metal, bevel=0.4)

    # --- Pistol grip + trigger group ---
    C.profile("TriggerPlate", [(150, 112), (276, 112), (276, 104), (150, 104)], 30.0, metal, bevel=1.0)
    front = C.bumpy_line((190, 112), (160, 10), 3, 1.8, side=-1.0)
    C.profile("PistolGrip", [(190, 112), (136, 112)] + [(122, 110), (116, 80), (120, 22), (130, 6)] +
              [(150, 4)] + [(160, 10)] + front[::-1][:1] + [(184, 62), (190, 112)], 31.0, bake, bevel=3.0, segs=3)
    C.cyl("GripScrew", 4.5, 0, 3, steel, y=15.6, z=18, rot=(0, 0, 90)).location.x = 0.140
    P.trigger_guard("TriggerGuard", 266, 192, 104, 66, 3.8, 10.0, metal, front_r=20, rear_r=8)
    P.trigger("Trigger", 232, 104, 36, steel, curve=10.0, thick=6.0)
    C.profile("SafetySelector", [(130, 150), (260, 150), (262, 140), (132, 140)], 2.0, steel, y=20.5, bevel=0.6)
    C.box("SelectorLever", 130, 142, 20, 22, 120, 152, steel, bevel=0.6)
    C.box("MagRelease", 188, 200, -6, 6, 94, 106, steel, bevel=0.5)

    # --- Curved 30-round banana magazine ---
    C.box("MagWellRear", 180, 192, -17, 17, 88, 112, metal, bevel=0.6)
    P.curved_mag("Magazine", 214, 112, 46.0, 360.0, 0.60, 31.0, metal, ribs=True, base_mat=steel)

    # --- Stock (walnut, with steel buttplate) ---
    stock = C.profile("Stock", [(2, 180), (-30, 176), (-120, 164), (-400, 168), (-410, 160), (-424, 90),
                                (-400, 54), (-340, 90), (-140, 108), (-20, 120), (2, 120)], 36.0, wood,
                      bevel=3.0, segs=3)
    C.profile("Buttplate", [(-398, 170), (-410, 164), (-428, 92), (-420, 82), (-400, 52), (-392, 56), (-388, 80),
                            (-408, 100), (-396, 164)][:5] + [(-400, 54), (-394, 60)], 38.0, steel, bevel=1.0)
    C.torus("SlingSwivel", 8, 1.8, (-150, 0, 105), steel, rot=(0, 90, 0))

    # rivets along the receiver
    for x in (24, 90, 240, 285):
        for s in (-1, 1):
            P.screw_head("Rivet%d_%d" % (x, s), x, s * 18.1, 126, 2.4, steel)
    return C.end_asset()
