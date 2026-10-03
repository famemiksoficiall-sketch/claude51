"""H&K MP5SD (integrally suppressed 9x19 SMG) with fixed A2 stock.

Overall length ~780 mm, barrel/suppressor line at z = 150 mm.
"""
import math

from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "MP5SD"
BORE_Z = 150.0


def build():
    root = C.begin_asset(NAME)
    stamped = M.parkerized()
    poly = M.polymer_black()
    grip_mat = M.grip_black()
    steel = M.steel()
    dark = M.gunmetal()

    # --- Stamped receiver: round cocking-tube top over a flat-sided body ---
    hw = 17.0
    rec = C.xsec("Receiver", C.round_top_xsec(hw, 116, 172, 17.0, n=10), 0, 300, stamped, bevel=0.6)
    # pressed reinforcement grooves along both sides
    for s in (-1, 1):
        y0, y1 = (hw - 0.8, hw + 4) if s > 0 else (-hw - 4, -hw + 0.8)
        C.boolean(rec, C.cutter_boxes([(20, 280, y0, y1, 140, 143), (60, 280, y0, y1, 124, 126)]))
    C.boolean(rec, C.cutter_boxes([(150, 196, -30, -8, 140, 160)]))  # ejection port (right)
    C.box("BoltHead", 150.5, 195.5, -12, 12, 138, 158, steel, bevel=0.6)
    C.box("EndCap", -6, 2, -16.5, 16.5, 118, 168, stamped, bevel=1.2)
    C.box("FrontTrunnion", 294, 304, -17.5, 17.5, 128, 168, stamped, bevel=1.0)
    # claw-mount style rail bases (spot welded) on the receiver top
    for x in (60, 230):
        C.xsec("ClawBase%d" % x, C.chamfer_xsec(8, 170, 175, 1.5), x - 8, x + 8, stamped, bevel=0.4)

    # --- Rotary drum rear sight ---
    C.xsec("RearSightBase", C.chamfer_xsec(14, 168, 176, 3), 18, 52, stamped, bevel=0.5)
    drum = C.lathe("RearSightDrum", [(0, 0), (0, 11), (24, 11), (24, 0)], dark, loc=(35, -12, 186),
                   rot=(0, 0, 90), segs=10)
    drum["sharp"] = 20.0
    C.boolean(drum, C.cutter_cyl(1.6, 0, 80, z=188))
    C.box("RearSightEars", 26, 44, -16, 16, 174, 182, stamped, bevel=0.8)

    # --- Integral suppressor + handguard ---
    sup = C.lathe("Suppressor", [(0, 0), (0, 25), (3, 26.5), (405, 26.5), (412, 25), (415, 21), (415, 0)], dark,
                  loc=(300, 0, BORE_Z), segs=64)
    sup["sharp"] = 50.0
    C.boolean(sup, C.cutter_cyl(5.0, 700, 720, z=BORE_Z))
    P.muzzle_bore("Bore", 714.9, 5.0, BORE_Z, depth=30)
    # ribbed SD handguard (slimline polymer) around the rear of the suppressor
    hg = [(0, 26.5), (0, 31)]
    for i in range(10):
        x = 12 + i * 14
        hg += [(x, 31), (x + 2, 29.3), (x + 8, 29.3), (x + 10, 31)]
    hg += [(160, 31), (164, 28), (166, 26.5)]
    C.lathe("Handguard", hg, poly, loc=(304, 0, BORE_Z), segs=48, closed=True)
    C.tube("HandguardCap", 26.4, 30, 470, 478, stamped, z=BORE_Z, segs=48)
    # suppressor clamp + hooded front sight
    C.tube("SightClamp", 26.4, 29, 625, 650, stamped, z=BORE_Z, segs=48)
    hood = C.lathe("FrontSightHood", [(0, 9), (0, 12), (18, 12), (18, 9)], stamped, loc=(628, 0, 190),
                   closed=True, segs=32)
    hood["sharp"] = 60.0
    C.boolean(hood, C.cutter_boxes([(620, 660, -20, 20, 170, 186)]))
    C.profile("FrontSightBase", [(628, 175), (646, 175), (646, 186), (628, 186)], 14.0, stamped, bevel=0.6)
    C.box("FrontSightPost", 636, 639, -1.2, 1.2, 182, 197, stamped, bevel=0.2)

    # cocking handle (left side, folded forward in its slot)
    C.box("CockingSlot", 318, 372, 30, 31.4, 158, 166, M.bore(), bevel=0)
    lever = C.profile("CockingLever", [(318, 160), (346, 160), (354, 165), (348, 168), (318, 166)], 4.0, steel,
                      y=34, bevel=0.6)
    lever["bevel"] = 0.6
    C.cyl("CockingKnob", 4.5, 346, 356, steel, y=34, z=164, segs=20)
    C.box("CockingStem", 318, 324, 30, 36, 160, 166, steel, bevel=0.4)

    # --- Trigger group (polymer Navy/SEF housing) ---
    tg = C.profile("TriggerHousing", [(110, 118), (262, 118), (262, 106), (248, 98), (200, 98), (134, 104),
                                      (110, 110)], 30.0, poly, bevel=1.4)
    front = C.bumpy_line((206, 100), (188, 14), 3, 2.0, side=-1.0)
    C.profile("Grip", [(160, 104), (206, 101)] + front + [(186, 8), (150, 6), (144, 12), (156, 100)], 32.0,
              grip_mat, bevel=2.5, segs=3)
    P.trigger_guard("TriggerGuard", 250, 204, 100, 62, 5.0, 12.0, poly, front_r=13, rear_r=8)
    P.trigger("Trigger", 228, 99, 24, steel, curve=6.0, thick=6.5)
    # SEF selector (left) with markings plate
    C.lathe("SelectorHub", [(0, 0), (0, 7), (2, 7), (2, 0)], steel, loc=(166, 15, 112), rot=(0, 0, 90))
    C.profile("SelectorLever", [(160, 110), (172, 110), (182, 126), (176, 128)], 2.0, steel, y=17.6, bevel=0.4)
    for i, col in enumerate([(0.9, 0.9, 0.9), (0.8, 0.1, 0.05), (0.8, 0.1, 0.05)]):
        mat = M.white_paint() if i == 0 else M.sight_dot()
        if i > 0:
            from ..lib.materials import polymer
            mat = polymer("RedMark", col, 0.4)
        C.cyl("SelMark%d" % i, 1.5, 0, 0.4, mat, y=15.0, z=106 + i * 5, rot=(0, 0, 90)).location.x = (178 + i * 4) * C.MM
    for s in (-1, 1):
        P.screw_head("HousingPin%d" % (s > 0), 122, s * 15.1, 112, 2.6, steel)
        P.screw_head("HousingPinB%d" % (s > 0), 256, s * 15.1, 112, 2.6, steel)

    # --- Curved 30-round magazine + magwell ---
    C.profile("MagWell", [(84, 118), (132, 118), (132, 102), (126, 98), (88, 98), (84, 102)], 32.0, stamped,
              bevel=1.0)
    P.curved_mag("Magazine", 90, 104, 36.0, 420.0, 0.50, 23.0, dark, ribs=True, base_mat=stamped)
    C.profile("MagRelease", [(130, 106), (148, 102), (150, 106), (134, 110)], 18.0, steel, bevel=0.6)

    # --- Fixed A2 stock ---
    stock = C.profile("Stock", [(2, 168), (-40, 168), (-320, 170), (-330, 164), (-330, 40), (-322, 33),
                                (-250, 50), (-140, 90), (-40, 116), (2, 118)], 36.0, poly, bevel=3.0, segs=3)
    stock["bevel"] = 3.0
    C.boolean(stock, C.cutter_boxes([(-250, -60, -30, -16.5, 120, 155), (-250, -60, 16.5, 30, 120, 155)]))
    C.profile("ButtPad", [(-330, 168), (-342, 166), (-344, 150), (-344, 48), (-342, 36), (-330, 34)], 40.0,
              M.rubber(), bevel=2.0)
    C.cyl("StockPin", 3, 0, 40, steel, y=-20, z=130, rot=(0, 0, 90)).location.x = -0.010
    C.torus("SlingLoopRear", 9, 1.8, (-300, 18, 150), steel, rot=(90, 0, 0))
    C.torus("SlingLoopFront", 9, 1.8, (290, 18, 132), steel, rot=(90, 0, 0))

    return C.end_asset()
