"""M4A4 carbine (AR-15 pattern, 5.56x45). Length ~840 mm, bore at z = 150."""
import math

from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "M4A4"
BZ = 150.0


def build():
    root = C.begin_asset(NAME)
    alu = M.parkerized()
    poly = M.polymer_black()
    grip_mat = M.grip_black()
    steel = M.steel()
    dark = M.gunmetal()

    # --- Upper receiver with flat-top rail ---
    upper = C.xsec("Upper", C.round_top_xsec(17.0, 138, 186, 9.0, n=6), 0, 235, alu, bevel=0.6)
    C.boolean(upper, C.cutter_boxes([(100, 150, -30, -6, 156, 176)]))  # ejection port
    C.box("DustCover", 100, 150, -17.6, -16.2, 160, 178, alu, bevel=0.6)
    C.box("BoltCarrier", 101, 149, -10, 10, 152, 174, steel, bevel=0.6)
    P.picatinny("TopRail", 0, 235, 186, alu, width=21.2, base_h=1.5, tooth_h=3.0, pitch=10.0)
    C.box("ForwardAssist", 60, 78, -30, -17, 156, 168, alu, bevel=0.8)
    C.cyl("ForwardAssistCap", 6, 50, 62, alu, y=-17, z=162, rot=(0, 0, -90), segs=16)
    C.box("FwdAssistPlate", 66, 70, 17.5, 22, 140, 150, alu, bevel=0.3)

    # --- Lower receiver ---
    lower = C.profile("Lower", [(0, 138), (235, 138), (235, 124), (150, 112), (110, 108), (60, 110),
                                (30, 124), (0, 130)], 32.0, alu, bevel=0.8)
    mw = C.profile("Magwell", [(110, 138), (185, 138), (190, 98), (190, 62), (112, 62), (108, 100)], 33.0, alu,
                   bevel=1.0)
    C.boolean(mw, C.cutter_boxes([(116, 180, -12, 12, 40, 130)]))
    C.box("MagReleaseButton", 154, 164, -22, -16, 110, 118, steel, bevel=0.6)
    C.box("BoltRelease", 188, 202, -17, -15, 98, 126, steel, bevel=0.5)
    # pistol grip (A2)
    front = C.bumpy_line((86, 112), (66, 12), 3, 2.0, side=-1.0)
    C.profile("PistolGrip", [(30, 118), (86, 112)] + front + [(64, 6), (30, 4), (22, 24), (10, 80), (14, 116)], 32.0,
              grip_mat, bevel=3.0, segs=3)
    C.cyl("GripScrew", 3.5, 0, 3, steel, y=15.6, z=22, rot=(0, 0, 90)).location.x = 0.052
    P.trigger_guard("TriggerGuard", 112, 64, 112, 80, 3.4, 10.0, alu, front_r=14, rear_r=8)
    P.trigger("Trigger", 94, 112, 26, steel, curve=6.0, thick=6.0)
    C.lathe("SelectorSwitch", [(0, 0), (0, 6), (4, 6), (4, 0)], steel, loc=(42, 15.5, 124), rot=(0, 0, 90))
    C.profile("SelectorLever", [(34, 122), (50, 122), (54, 134), (46, 136)], 2.2, steel, y=19.5, bevel=0.5)

    # --- Magazine (30 rd STANAG) ---
    P.curved_mag("Magazine", 124, 62, 32.0, 700.0, 0.16, 25.0, dark, ribs=True, base_mat=poly)

    # --- Barrel + handguard (quad rail style) + gas block + muzzle ---
    C.lathe("Barrel", [(0, 0), (0, 8.5), (180, 8.5), (180, 0)], steel, loc=(235, 0, BZ), segs=32)
    hg = C.xsec("Handguard", C.chamfer_xsec(24, 126, 175, 6.0, 6.0), 235, 485, poly, bevel=1.2)
    C.boolean(hg, C.cutter_cyl(11, 220, 495, z=BZ))
    for s in (-1, 1):
        y0, y1 = (21, 26) if s > 0 else (-26, -21)
        C.boolean(hg, [C.cutter_boxes([(250 + i * 18, 257 + i * 18, y0, y1, 131, 170)]) for i in range(13)])
    C.box("DeltaRing", 228, 240, -26, 26, 122, 178, alu, bevel=0.8)
    P.picatinny("HandguardRailTop", 235, 485, 175, alu, width=21.2, base_h=1.5, tooth_h=3.0)
    C.lathe("GasBlock", [(0, 0), (0, 14), (28, 14), (28, 0)], steel, loc=(488, 0, BZ), segs=24)
    C.lathe("BarrelFront", [(0, 0), (0, 8.5), (110, 8.5), (110, 0)], steel, loc=(490, 0, BZ), segs=24)
    sight = C.profile("FrontSightPost", [(488, 176), (508, 176), (504, 215), (494, 215)], 8.0, steel, bevel=0.5)
    C.cyl("FrontSightPin", 1.2, 489, 507, steel, z=212, segs=8)
    C.lathe("FlashHider", [(0, 5.6), (0, 9.5), (4, 11), (46, 11), (50, 9.5), (50, 5.6)], steel, loc=(600, 0, BZ),
            closed=True, segs=36)
    hider = C.collection_objects()[-1]
    for ang in (0, 60, 120):
        cut = C.cutter_boxes([(612, 640, -1.6, 1.6, BZ - 14, BZ + 14)])
        C.boolean(hider, C.rotate_about_x(cut, ang, BZ))
    P.muzzle_bore("Bore", 649.9, 5.6, BZ, depth=30)

    # --- Carry handle replacement: rear flip BUIS + red-dot style optic ---
    P.flip_sight("RearSight", 40, 189.5, steel, front=False, height=20)
    C.box("OpticBase", 98, 168, -14, 14, 189.5, 195, dark, bevel=0.8)
    opt = C.xsec("OpticBody", C.round_top_xsec(14, 195, 232, 10, n=8, bottom_r=3), 100, 166, dark, bevel=1.0)
    C.boolean(opt, C.cutter_boxes([(150, 170, -12, 12, 200, 226)]))
    C.profile("OpticLens", C.rrect(147, 152, 202, 226, 2), 24.0, M.lens(), bevel=0.2)
    C.cyl("OpticDot", 1.0, 146.2, 146.8, M.sight_dot(), z=214, rot=(0, 0, 180), segs=12)
    C.cyl("OpticKnob", 6, 120, 128, dark, y=14, z=212, rot=(0, 0, 90), segs=16)

    # --- Collapsible stock + buffer tube ---
    C.tube("BufferTube", 11, 14.5, -190, 2, alu, z=BZ - 8, segs=32)
    st = C.profile("Stock", [(-182, 160), (-176, 164), (-20, 160), (-18, 124), (-60, 112), (-182, 118)], 38.0,
                   poly, bevel=2.5, segs=3)
    C.boolean(st, C.cutter_boxes([(-170, -40, -30, -12, 130, 155)]))
    C.profile("Buttpad", [(-182, 170), (-196, 166), (-200, 112), (-192, 100), (-182, 108)], 36.0, M.rubber(),
              bevel=2.0)
    C.box("CheekWeld", -170, -30, -17, 17, 158, 164, poly, bevel=2.0)
    C.torus("SlingLoop", 7, 1.6, (-150, 20, 118), steel, rot=(90, 0, 0))
    C.box("EndPlate", -8, 4, -17, 17, 124, 132, alu, bevel=1.0)

    return C.end_asset()
