"""SIG Sauer P250 (9x19, DAO hammerless). Length ~198 mm, height ~140 mm."""
from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "P250"


def build():
    root = C.begin_asset(NAME)
    slide_mat = M.gunmetal()
    frame_mat = M.polymer_black()
    grip_mat = M.grip_black()
    steel = M.steel()

    # --- Slide: rounded SIG-style top, tapered nose ---
    hw = 12.7
    slide = C.xsec("Slide", C.round_top_xsec(hw, 98, 131, 6.0, n=6), 0, 198, slide_mat, bevel=0.5)
    side = C.cutter_profile([(0, 98), (190, 98), (198, 106), (198, 125), (193, 131), (4, 131), (0, 127)], -20, 20)
    C.intersect(slide, side)
    # slanted rear serrations
    C.boolean(slide, C.serrations(9, 4.0, 7, 99, 132, 1.0, hw, width=1.8, slant=-4.0))
    # ejection port + breech-block style top cut
    C.boolean(slide, C.cutter_boxes([(98, 146, -20, 8, 118, 140)]))
    # muzzle
    C.boolean(slide, C.cutter_cyl(6.4, 192, 205, z=119))
    C.boolean(slide, C.cutter_cyl(4.5, 192, 205, z=105.5))
    # slide lightening flats on the lower nose
    C.boolean(slide, C.cutter_profile([(160, 96), (200, 96), (200, 103), (160, 100)], -20, 20))

    C.box("BarrelBlock", 98.5, 145.5, -9.4, 9.4, 112, 130.2, steel, bevel=0.6)
    C.box("Extractor", 104, 126, -13.0, -12.2, 121, 125, steel, bevel=0.2)
    C.tube("BarrelMuzzle", 4.5, 6.2, 160, 197.6, steel, z=119, segs=32)
    P.muzzle_bore("Bore", 197.4, 4.5, 119, depth=30)
    C.cyl("RecoilRod", 4.2, 150, 197.5, steel, z=105.5, segs=20)

    # SIGLITE night sights (dovetailed)
    fs = C.profile("FrontSight", [(180, 130), (189, 130), (189, 137), (183, 137)], 3.6, steel, bevel=0.4)
    fs["bevel"] = 0.4
    C.cyl("FrontSightTritium", 0.9, 182.8, 183.2, M.sight_dot(), z=134.8, rot=(0, 0, 180))
    rear = C.profile("RearSight", [(9, 130), (24, 130), (24, 137), (11, 137.5)], 18.0, steel, bevel=0.5)
    C.boolean(rear, C.cutter_boxes([(6, 26, -1.8, 1.8, 133, 140)]))
    for y in (-4.5, 4.5):
        C.cyl("RearTritium%d" % (y > 0), 0.9, 8.6, 9.2, M.sight_dot(), y=y, z=135, rot=(0, 0, 180))

    # --- Frame with 3-slot rail ---
    frame = C.profile("Frame", [(190, 98), (190, 89), (185, 83), (115, 83), (62, 80), (10, 86),
                                (-2, 94), (-3, 98)], 24.0, frame_mat, bevel=0.9)
    C.boolean(frame, C.cutter_boxes([(132 + i * 14, 138 + i * 14, -14, 14, 82, 87) for i in range(3)]))
    C.boolean(frame, C.cutter_boxes([(126, 186, -14, -10.6, 86, 89), (126, 186, 10.6, 14, 86, 89)]))
    C.box("RailGap", 0, 189, -11.6, 11.6, 97.4, 98.2, M.bore(), bevel=0)

    # --- Grip module: straight front strap, high undercut, rounded beavertail ---
    front = C.bezier((64, 80), (58, 40), (40, 4), 10)
    grip_pts = [(14, 88), (64, 81)] + front + [(36, 0), (-20, 2), (-24, 6)]
    grip_pts += [(-4, 76), (-2, 86), (-10, 94), (-6, 98.5), (10, 98)]
    grip = C.profile("Grip", grip_pts, 30.0, grip_mat, bevel=2.4, segs=3)
    C.boolean(grip, C.cutter_profile([(-14, 86), (66, 86), (66, 99), (-14, 99)], 12.0, 30))
    C.boolean(grip, C.cutter_profile([(-14, 86), (66, 86), (66, 99), (-14, 99)], -30, -12.0))
    # grip panel texture inset outline (shallow recess for the side panels)
    for s in (-1, 1):
        y0, y1 = (14.2, 20) if s > 0 else (-20, -14.2)
        C.boolean(grip, C.cutter_profile([(-14, 12), (32, 10), (50, 60), (52, 74), (2, 78)], y0, y1))
    C.profile("MagBase", [(-22, 2.5), (37, 0.5), (38, -4), (33, -7), (-20, -7), (-23, -2)], 25.0,
              frame_mat, bevel=1.3)

    P.trigger_guard("TriggerGuard", 116, 64, 83, 54, 5.0, 10.5, frame_mat, front_r=13, rear_r=9, hook=True)
    P.trigger("Trigger", 90, 82, 24, steel, curve=7.0, thick=6.0)

    # controls
    C.profile("SlideCatch", [(66, 93), (102, 93), (104, 96.5), (70, 97)], 1.6, steel, y=12.4, bevel=0.3)
    C.box("SlideCatchTab", 66, 74, 12, 14.8, 90, 97, steel, bevel=0.5)
    C.cyl("TakedownLever", 4.0, 112, 114, steel, y=12.0, z=90, rot=(0, 0, 90), segs=20)
    C.box("TakedownArm", 108, 118, 12.6, 14.2, 87, 91, steel, bevel=0.4)
    C.box("MagRelease", 64, 72, -16, 16, 72, 80, frame_mat, bevel=1.0)
    for y in (-12.1, 12.1):
        P.screw_head("FramePin%d" % (y > 0), 28, y, 90, 1.7, steel)
        P.screw_head("FramePinB%d" % (y > 0), 86, y, 88, 1.7, steel)

    return C.end_asset()
