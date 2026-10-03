"""IMI/Magnum Research Desert Eagle Mark XIX (.50 AE, 6" barrel).

Length ~267 mm, height ~149 mm, width ~32 mm. Gas-operated with the
characteristic triangular barrel that carries the top rail.
"""
from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "DesertEagle"


def build():
    root = C.begin_asset(NAME)
    finish = M.stainless()
    dark = M.gunmetal()
    grip_mat = M.rubber()
    steel = M.steel()

    # --- Slide ---
    hw = 16.0
    slide = C.xsec("Slide", C.chamfer_xsec(hw, 100, 146, 6.0, 1.0), 0, 172, finish, bevel=0.6)
    C.intersect(slide, C.cutter_profile([(0, 100), (172, 100), (172, 146), (4, 146), (0, 141)], -30, 30))
    C.boolean(slide, C.serrations(24, 4.2, 9, 101, 147, 1.1, hw, width=2.0))
    C.boolean(slide, C.cutter_boxes([(92, 150, -30, 4, 122, 160)]))  # ejection port
    C.boolean(slide, C.cutter_boxes([(-1, 14, -6, 6, 112, 150)]))  # hammer slot
    C.box("Bolt", 92.5, 149.5, -11, 11, 112, 140, steel, bevel=0.8)
    C.box("BoltLugs", 140, 149, -12.5, -10, 118, 136, steel, bevel=0.3)
    C.box("Extractor", 100, 124, -16.6, -15.4, 130, 135, steel, bevel=0.3)

    # --- Triangular barrel with top rail ---
    tri = [(-16, 100), (16, 100), (16, 108), (9, 146), (-9, 146), (-16, 108)]
    barrel = C.xsec("Barrel", tri, 160, 267, finish, bevel=0.6)
    for s in (-1, 1):
        y0, y1 = (13.2, 30) if s > 0 else (-30, -13.2)
        C.boolean(barrel, C.cutter_boxes([(176, 256, y0, y1, 109, 117)]))  # side flutes
    C.boolean(barrel, C.cutter_cyl(6.4, 250, 280, z=128))
    P.muzzle_bore("Bore", 266.8, 6.4, 128, depth=40)
    C.tube("Crown", 6.4, 8.2, 266.4, 267.6, steel, z=128, segs=32)
    P.picatinny("BarrelRail", 172, 252, 146, finish, width=18.0, base_h=2.5, tooth_h=3.0)
    C.box("BarrelSlideJoint", 158, 172, -15.5, 15.5, 100, 144.8, steel, bevel=0.5)

    # sights
    fs = C.profile("FrontSight", [(252, 146), (264, 146), (264, 158), (255, 162), (252, 162)], 4.0, finish,
                   bevel=0.4)
    fs["bevel"] = 0.4
    rs = C.profile("RearSight", [(14, 145.5), (32, 145.5), (32, 152), (17, 154)], 22.0, dark, bevel=0.6)
    C.boolean(rs, C.cutter_boxes([(10, 36, -2.2, 2.2, 149, 160)]))

    # ambidextrous safety + hammer
    for s in (-1, 1):
        y = s * 17.2
        C.profile("Safety%s" % ("L" if s > 0 else "R"), [(8, 130), (26, 128), (30, 132), (26, 138), (8, 138)],
                  2.4, dark, y=y, bevel=0.5)
        C.cyl("SafetyAxle%s" % ("L" if s > 0 else "R"), 4.5, 0, 1.0, dark, y=y - s * 0.5, z=134,
              rot=(0, 0, 90 * s), segs=24).location.x = 0.014
    hammer = C.profile("Hammer", [(-4, 104), (8, 104), (8, 128), (2, 142), (-6, 148), (-12, 146), (-11, 140), (-4, 128)],
              10.0, dark, bevel=0.8)
    C.boolean(hammer, C.cutter_cyl(3.0, -6, 34, y=-20, z=136, rot=(0, 0, 90)))

    # --- Frame ---
    frame = C.profile("Frame", [(262, 100), (262, 92), (255, 86), (132, 86), (80, 84), (16, 88), (2, 96),
                                (-6, 100)], 30.0, finish, bevel=1.0)
    C.boolean(frame, C.cutter_boxes([(140, 250, -20, -14, 90, 95), (140, 250, 14, 20, 90, 95)]))
    C.box("RailGap", -4, 261, -15.6, 15.6, 99.4, 100.4, M.bore(), bevel=0)
    C.cyl("BarrelLatch", 5, 0, 3, steel, y=15.0, z=93, rot=(0, 0, 90), segs=24).location.x = 0.120

    # --- Wrap-around rubber grip ---
    front = C.bumpy_line((82, 84), (58, 4), 3, 1.4, side=-1.0)
    gpts = [(10, 92), (82, 85)] + front + [(56, 0), (-18, 2), (-22, 8), (-2, 84), (-6, 96), (4, 97)]
    grip = C.profile("Grip", gpts, 34.0, grip_mat, bevel=2.8, segs=3)
    C.boolean(grip, C.cutter_profile([(-12, 88), (90, 88), (90, 100), (-12, 100)], 15.2, 40))
    C.boolean(grip, C.cutter_profile([(-12, 88), (90, 88), (90, 100), (-12, 100)], -40, -15.2))
    # finger-groove relief lines
    C.profile("GripStrapSteel", [(-6, 86), (2, 96), (8, 96), (2, 86)], 22, finish, bevel=0.6)
    C.profile("MagBase", [(-22, 3), (58, 1), (60, -4), (55, -8), (-20, -8), (-24, -3)], 28.0, finish, bevel=1.4)
    for y in (-17.2, 17.2):
        P.screw_head("GripScrew%d" % (y > 0), 30, y, 40, 3.0, steel)

    P.trigger_guard("TriggerGuard", 134, 82, 86, 50, 5.5, 11.0, finish, front_r=16, rear_r=10, hook=True)
    P.trigger("Trigger", 108, 85, 27, dark, curve=7.0, thick=7.0)

    C.profile("SlideCatch", [(78, 96), (118, 96), (122, 100.5), (84, 101)], 2.0, dark, y=15.6, bevel=0.4)
    C.box("SlideCatchTab", 78, 88, 15, 18, 92, 101, dark, bevel=0.5)
    C.box("MagRelease", 82, 92, -17.5, 17.5, 74, 82, dark, bevel=1.0)
    for y in (-15.2, 15.2):
        P.screw_head("FramePin%d" % (y > 0), 30, y, 94, 2.0, steel)
        P.screw_head("FramePinB%d" % (y > 0), 112, y, 94, 2.0, steel)

    return C.end_asset()
