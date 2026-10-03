"""Glock-18 (select-fire 9x19). Overall length ~186 mm, height ~138 mm."""
from ..lib import core as C
from ..lib import parts as P
from ..lib.materials import M

NAME = "Glock18"


def build():
    root = C.begin_asset(NAME)
    slide_mat = M.gunmetal()
    frame_mat = M.polymer_black()
    grip_mat = M.grip_black()
    steel = M.steel()

    # --- Slide: boxy cross-section intersected with the side silhouette ---
    hw = 12.75
    slide = C.xsec("Slide", C.chamfer_xsec(hw, 96, 128, 3.2, 0.8), 0, 186, slide_mat, bevel=0.5)
    side = C.cutter_profile([(0, 96), (186, 96), (186, 120), (180.5, 128), (0, 128)], -20, 20)
    C.intersect(slide, side)
    # rear cocking serrations (Gen3 style, vertical)
    C.boolean(slide, C.serrations(8, 3.4, 8, 97, 129, 0.9, hw, width=1.5))
    # ejection port (right side / top)
    C.boolean(slide, C.cutter_boxes([(96, 142, -20, 7.5, 114, 140)]))
    # muzzle opening + guide rod hole
    C.boolean(slide, C.cutter_cyl(6.2, 180, 190, z=115.5))
    C.boolean(slide, C.cutter_cyl(4.0, 180, 190, z=103.5))
    # rear plate recess
    C.boolean(slide, C.cutter_boxes([(-1, 1.0, -8, 8, 99, 122)]))
    C.box("SlideCoverPlate", 0.2, 1.4, -7.6, 7.6, 99.5, 121.5, steel, bevel=0.3)

    # barrel hood visible through the port, chamber + muzzle crown
    C.box("BarrelHood", 96.5, 141.5, -8.8, 8.8, 108, 126.4, steel, bevel=0.6)
    C.box("ExtractorClaw", 100, 112, -12.95, -12.2, 116, 120, steel, bevel=0.2)
    C.tube("BarrelMuzzle", 4.5, 5.9, 150, 185.6, steel, z=115.5, segs=32)
    P.muzzle_bore("Bore", 185.4, 4.5, 115.5, depth=30)
    C.cyl("GuideRod", 3.6, 150, 185.2, M.polymer_black(), z=103.5, segs=20)

    # sights (polymer-style Glock sights: U-notch rear, dot front)
    C.box("FrontSight", 171, 177, -1.8, 1.8, 127.5, 133.5, steel, bevel=0.5)
    C.cyl("FrontSightDot", 1.0, 0, 0.6, M.white_paint(), z=131.5, rot=(0, 0, 180)).location.x = 0.1710
    rear = C.box("RearSight", 10, 20, -6, 6, 127.5, 134.5, steel, bevel=0.6)
    C.boolean(rear, C.cutter_boxes([(8, 22, -1.7, 1.7, 130.5, 140)]))

    # Glock-18 selector switch on rear-left of the slide
    C.box("SelectorBase", 2, 14, 12.6, 13.6, 118, 125, steel, bevel=0.3)
    C.profile("SelectorLever", [(4, 121), (12, 121), (13, 127.5), (5, 127.5)], 2.0, steel,
              y=14.4, bevel=0.4)

    # --- Frame: dust cover with accessory rail slot ---
    frame = C.profile("Frame", [(183, 96), (183, 87), (176, 82), (110, 82), (60, 80), (12, 84),
                                (4, 92), (-6, 96)], 22.0, frame_mat, bevel=0.8)
    C.boolean(frame, C.cutter_boxes([(128, 176, -12, -9.4, 85, 88), (128, 176, 9.4, 12, 85, 88)]))
    # slide rails visible gap line
    C.box("RailGap", 0, 182, -11.2, 11.2, 95.4, 96.2, M.bore(), bevel=0)

    # --- Grip with finger grooves and beavertail ---
    front = C.bumpy_line((62, 80), (34, 4), 3, 2.6, side=-1.0)
    grip_pts = [(12, 86), (62, 81)] + front + [(31, 1), (-24, 3), (-28, 7)]
    grip_pts += [(-6, 72), (-3, 84), (-10, 91), (-7, 96.5), (8, 96)]
    grip = C.profile("Grip", grip_pts, 30.0, grip_mat, bevel=2.2, segs=3)
    # thumb rest / grip relief cut on both sides (slightly narrower top section)
    C.boolean(grip, C.cutter_profile([(-12, 84), (62, 84), (62, 97), (-12, 97)], 11.2, 30))
    C.boolean(grip, C.cutter_profile([(-12, 84), (62, 84), (62, 97), (-12, 97)], -30, -11.2))
    # magazine well flare
    C.boolean(grip, C.cutter_profile([(-26, 0), (33, 0), (31, 3), (-24, 4)], -11, 11))

    # magazine + baseplate (protruding)
    C.profile("MagBase", [(-27, 3.5), (31, 1), (32, -3), (28, -6), (-26, -6), (-29, -2)], 26.0,
              frame_mat, bevel=1.4, segs=2)
    C.profile("MagBody", [(-24, 4), (30, 2), (31, 5), (-23, 7)], 22.0, slide_mat, bevel=0.4)

    # trigger guard (square-front Glock style) & trigger with blade safety
    P.trigger_guard("TriggerGuard", 110, 62, 82, 54, 5.5, 10.0, frame_mat, front_r=6, rear_r=8)
    P.trigger("Trigger", 86, 81, 22, frame_mat, curve=5.0, thick=6.5, blade_safety=True)

    # controls
    C.profile("SlideStop", [(70, 92), (100, 92), (101, 95), (72, 95)], 1.4, steel, y=11.8, bevel=0.3)
    C.box("SlideStopTab", 70, 77, 11, 13.6, 90.5, 95, steel, bevel=0.4)
    C.box("TakedownL", 98, 106, 10.7, 11.9, 86, 91, steel, bevel=0.3)
    C.box("TakedownR", 98, 106, -11.9, -10.7, 86, 91, steel, bevel=0.3)
    C.box("MagRelease", 62, 70, -15.4, 15.4, 72, 79, frame_mat, bevel=0.8)
    for y in (-11.1, 11.1):
        P.screw_head("Pin%d" % (y > 0), 30, y, 88, 1.6, steel)
        P.screw_head("PinB%d" % (y > 0), 88, y, 86, 1.6, steel)
        P.screw_head("PinC%d" % (y > 0), 4, y * 1.37, 74, 1.6, steel)

    return C.end_asset()
