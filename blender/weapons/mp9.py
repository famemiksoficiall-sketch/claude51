"""B&T MP9 (9x19 machine pistol) with the stock folded to the right side.

Length ~303 mm (stock folded), height ~ 160 mm without magazine.
"""
from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "MP9"


def build():
    root = C.begin_asset(NAME)
    body = M.polymer_black()
    grip_mat = M.grip_black()
    metal = M.gunmetal()
    steel = M.steel()

    # --- Upper receiver (polymer shell around steel core) ---
    hw = 19.0
    upper = C.xsec("Upper", C.round_top_xsec(hw, 120, 168, 6.0, n=5, bottom_r=3.0), 0, 252, body, bevel=0.8)
    C.intersect(upper, C.cutter_profile([(0, 120), (244, 120), (252, 130), (252, 160), (246, 168), (4, 168),
                                         (0, 164)], -30, 30))
    C.boolean(upper, C.cutter_boxes([(118, 162, -30, -6, 146, 172)]))  # ejection port
    C.box("Bolt", 118.5, 161.5, -12, 12, 138, 166, steel, bevel=0.6)
    # side lightening panels
    for s in (-1, 1):
        y0, y1 = (hw - 1.0, hw + 5) if s > 0 else (-hw - 5, -hw + 1.0)
        C.boolean(upper, C.cutter_profile(C.rrect(170, 236, 128, 156, 5), y0, y1))
    P.picatinny("TopRail", 6, 240, 168, metal, width=21.2)

    # --- Lower housing + grip (magazine goes through the grip) ---
    lower = C.profile("Lower", [(20, 122), (176, 122), (176, 113), (150, 104), (104, 104), (40, 106), (20, 112)],
                      34.0, body, bevel=1.2)
    front = C.bumpy_line((104, 106), (90, 18), 3, 1.8, side=-1.0)
    grip = C.profile("Grip", [(56, 112), (104, 110)] + front + [(88, 12), (44, 10), (40, 16), (54, 106)], 34.0,
                     grip_mat, bevel=2.4, segs=3)
    C.profile("MagWellFlare", [(40, 6), (92, 8), (93, 16), (42, 16)], 37.0, body, bevel=1.4)
    # magazine (30 rds, straight) + baseplate
    C.profile("Magazine", [(48, 8), (86, 8), (80, -92), (44, -92)], 24.0, metal, bevel=0.6)
    C.profile("MagBase", [(41, -90), (84, -90), (85, -97), (80, -100), (44, -100), (40, -96)], 28.0, body,
              bevel=1.2)
    C.box("MagRelease", 62, 74, -18, 18, 100, 106, body, bevel=0.8)

    P.trigger_guard("TriggerGuard", 160, 104, 106, 66, 5.0, 12.0, body, front_r=14, rear_r=10)
    P.trigger("Trigger", 128, 104, 24, steel, curve=6.0, thick=7.0)
    # ambi safety buttons + selector
    C.cyl("SafetyBtn", 4.5, 135, 140, steel, z=114, rot=(0, 0, 90)).location.y = -0.021
    C.lathe("Selector", [(0, 0), (0, 7), (2.5, 7), (2.5, 0)], steel, loc=(70, 17.5, 116), rot=(0, 0, 90))
    C.profile("SelectorLever", [(64, 114), (76, 114), (82, 124), (78, 126)], 2.0, steel, y=20.5, bevel=0.4)

    # --- Folding vertical foregrip ---
    C.box("ForegripHinge", 196, 226, -12, 12, 112, 122, metal, bevel=0.8)
    fg = C.bumpy_line((228, 112), (236, 48), 3, 1.5, side=-1.0)
    C.profile("Foregrip", [(198, 112)] + fg + [(234, 44), (206, 44), (200, 50)], 26.0, grip_mat, bevel=2.4, segs=3)
    C.cyl("ForegripPin", 3.2, 211, 238, steel, y=-14, z=117, rot=(0, 0, 90), segs=16)

    # --- Barrel + muzzle device ---
    C.lathe("Barrel", [(0, 0), (0, 7.5), (30, 7.5), (30, 6.8), (36, 6.8), (36, 0)], steel, loc=(250, 0, 145))
    hider = C.lathe("FlashHider", [(0, 4.6), (0, 10), (2, 10.6), (22, 10.6), (24, 10), (24, 4.6)], metal,
                    loc=(282, 0, 145), closed=True, segs=36)
    for ang in (0, 60, 120):
        cut = C.cutter_boxes([(292, 310, -1.6, 1.6, 132, 158)])
        C.boolean(hider, C.rotate_about_x(cut, ang, 145))
    P.muzzle_bore("Bore", 306, 4.5, 145, depth=20)

    # --- Iron sights on the rail ---
    P.flip_sight("RearSight", 24, 175.3, metal, front=False, height=20)
    P.flip_sight("FrontSight", 226, 175.3, metal, front=True, height=22)

    # --- Charging handle (rear, AR-style T) ---
    C.box("ChargingStem", -8, 2, -5, 5, 152, 160, metal, bevel=0.5)
    C.profile("ChargingT", [(-14, 150), (-4, 150), (-4, 162), (-14, 162)], 46.0, metal, bevel=1.2)

    # --- Folded skeleton stock along the right side ---
    y0, y1 = -31, -24
    C.box("StockHinge", -6, 14, -32, -18, 124, 162, metal, bevel=1.0)
    C.box("StockBarTop", 10, 236, y0, y1, 152, 160, body, bevel=1.2)
    C.box("StockBarBottom", 10, 236, y0, y1, 126, 134, body, bevel=1.2)
    C.box("StockCross", 120, 128, y0, y1, 130, 156, body, bevel=0.8)
    butt = C.profile("Buttplate", [(234, 118), (246, 118), (248, 168), (236, 170)], 12.0, M.rubber(), y=-29,
                     bevel=2.0)
    butt["bevel"] = 2.0
    for s in (-1, 1):
        P.screw_head("Pin%d" % (s > 0), 34, s * 17.1, 115, 2.0, steel)
        P.screw_head("PinB%d" % (s > 0), 160, s * 17.1, 116, 2.0, steel)

    # sling loop at the rear
    C.torus("SlingLoop", 7, 1.6, (-2, 18, 132), steel, rot=(90, 0, 0))

    return C.end_asset()
