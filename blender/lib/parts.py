"""Reusable firearm components (dimensions in mm, weapon space)."""
import math

from . import core as C
from .materials import M


def trigger_guard(name, x_front, x_rear, z_top, z_bot, wall, width, mat,
                  front_r=10.0, rear_r=6.0, hook=False):
    """U-shaped trigger guard; open at the top where it meets the frame."""
    outer, inner = [], []
    # front edge going down, bottom, rear edge up (outer contour)
    outer.append((x_front, z_top))
    outer += C.circle(x_front - front_r, z_bot + front_r, front_r, 6, 0, -90)
    outer += C.circle(x_rear + rear_r, z_bot + rear_r, rear_r, 6, -90, -180)
    outer.append((x_rear, z_top))
    ir_f = max(front_r - wall, 1.0)
    ir_r = max(rear_r - wall, 1.0)
    inner.append((x_rear + wall, z_top))
    inner += C.circle(x_rear + wall + ir_r, z_bot + wall + ir_r, ir_r, 6, -180, -90)
    inner += C.circle(x_front - wall - ir_f, z_bot + wall + ir_f, ir_f, 6, -90, 0)
    inner.append((x_front - wall, z_top))
    pts = outer + inner
    obj = C.profile(name, pts, width, mat, bevel=0.6)
    if hook:
        hz = z_bot + front_r * 1.2
        C.profile(name + "Hook", [(x_front - 2, hz + 6), (x_front + 3, hz + 2), (x_front + 2, hz - 4),
                                  (x_front - 2, hz - 3)], width, mat, bevel=0.5)
    return obj


def trigger(name, x, z_top, length, mat, curve=6.0, thick=6.0, blade_safety=False, angle=0.0):
    """Curved trigger blade hanging from (x, z_top)."""
    pts_front, pts_back = [], []
    n = 8
    for i in range(n + 1):
        t = i / n
        z = z_top - length * t
        off = curve * math.sin(math.pi * t * 0.9) - angle * t
        w = 4.5 - 1.5 * t
        pts_front.append((x + off, z))
        pts_back.append((x + off - w, z))
    pts = pts_front + list(reversed(pts_back))
    obj = C.profile(name, pts, thick, mat, bevel=0.6)
    if blade_safety:
        C.profile(name + "Safety", [(x + curve * 0.6 - 1.0, z_top - length * 0.15),
                                    (x + curve * 0.7 + 0.6, z_top - length * 0.35),
                                    (x + curve * 0.6 + 0.4, z_top - length * 0.75),
                                    (x + curve * 0.6 - 1.0, z_top - length * 0.6)],
                  2.0, M.polymer_black(), bevel=0.3)
    return obj


def picatinny(name, x0, x1, z, mat, width=21.2, base_h=4.0, tooth_h=3.0, pitch=10.0,
              slot=5.3, y=0.0, side=None):
    """MIL-STD-1913 style rail. `side` = None (top), 'L', 'R', 'B' orients it."""
    hw = width / 2
    base = C.xsec(name, [(y - hw + 1.2, z), (y + hw - 1.2, z), (y + hw, z + 1.2),
                         (y + hw, z + base_h), (y - hw, z + base_h), (y - hw, z + 1.2)],
                  x0, x1, mat, bevel=0.3)
    teeth = []
    n = int((x1 - x0 - 2) // pitch)
    start = x0 + (x1 - x0 - (n * pitch - slot)) / 2
    for i in range(n):
        a = start + i * pitch
        b = a + pitch - slot
        teeth.append((a, b, y - hw, y + hw, z + base_h - 0.1, z + base_h + tooth_h))
    t = C.boxes(name + "Teeth", teeth, mat, bevel=0.35, segs=1)
    # dovetail undercut look: chamfer the top tooth edges via bevel; cut side grooves
    cut = C.cutter_boxes([(x0 - 1, x1 + 1, y - hw - 1, y - hw + 1.6, z + base_h + 0.6, z + base_h + 1.8),
                          (x0 - 1, x1 + 1, y + hw - 1.6, y + hw + 1, z + base_h + 0.6, z + base_h + 1.8)])
    C.boolean(t, cut)
    C.union(base, [t])
    base["bevel"] = 0.3
    if side:
        rot = {"L": (-90, 0, 0), "R": (90, 0, 0), "B": (180, 0, 0)}[side]
        base.rotation_euler = [math.radians(a) for a in rot]
    return base


def flip_sight(name, x, z, mat, front=False, height=22.0):
    """Folding BUIS-style sight sitting on a rail top at height z."""
    L = 40.0 if not front else 30.0
    C.xsec(name + "Base", C.chamfer_xsec(12, z, z + 7, 2), x - L / 2, x + L / 2, mat, bevel=0.4)
    if front:
        pts = [(x - 6, z + 7), (x + 6, z + 7), (x + 3, z + height), (x - 3, z + height)]
        ear = C.profile(name + "Ears", pts, 18, mat, bevel=0.4)
        cut = C.cutter_profile([(x - 10, z + 11), (x + 10, z + 11), (x + 10, z + height + 2), (x - 10, z + height + 2)],
                               -6, 6)
        C.boolean(ear, cut)
        C.box(name + "Post", x - 1.2, x + 1.2, -1.2, 1.2, z + 7, z + height - 2, mat, bevel=0.2)
    else:
        pts = [(x - 7, z + 7), (x + 5, z + 7), (x + 3, z + height), (x - 5, z + height)]
        ap = C.profile(name + "Leaf", pts, 20, mat, bevel=0.4)
        cut = C.cutter_profile([(x - 12, z + 11), (x + 12, z + 11), (x + 12, z + height - 6), (x - 12, z + height - 6)],
                               -10.5, -4)
        cut2 = C.cutter_profile([(x - 12, z + 11), (x + 12, z + 11), (x + 12, z + height - 6), (x - 12, z + height - 6)],
                                4, 10.5)
        C.boolean(ap, [cut, cut2])
        hole = C.cutter_cyl(1.6, x - 10, x + 10, z=z + height - 4.5)
        C.boolean(ap, hole)
        # windage knob
        C.cyl(name + "Knob", 4.5, 0, 4, mat, y=-10, z=z + 4, rot=(0, 0, 90), bevel=0.3)


def scope(name, x0, x1, z, tube_r=15.0, obj_r=28.0, eye_r=21.0, body=None, lens=None):
    """Riflescope along X from eyepiece x0 to objective x1, centred on height z."""
    body = body or M.polymer_black()
    lens = lens or M.lens()
    L = x1 - x0
    e = 85.0  # ocular length
    o = 95.0  # objective bell length
    pts = [
        (0, eye_r - 4), (0, eye_r), (4, eye_r + 0.5), (e * 0.45, eye_r + 0.5), (e * 0.5, eye_r - 1.5),
        (e * 0.55, eye_r), (e * 0.75, eye_r), (e, tube_r + 2), (e + 6, tube_r),
        (L - o - 6, tube_r), (L - o + 10, tube_r + 2), (L - 12, obj_r), (L - 4, obj_r + 0.6), (L, obj_r),
        (L, obj_r - 3),
    ]
    tube = C.lathe(name + "Tube", pts, body, loc=(x0, 0, z), segs=64, bevel=0.0)
    tube["sharp"] = 25.0
    # lenses (recessed)
    C.lathe(name + "LensRear", [(0, 0), (0, eye_r - 4), (1, eye_r - 4), (1, 0)], lens,
            loc=(x0 + 3, 0, z), segs=48)
    C.lathe(name + "LensFront", [(0, 0), (0, obj_r - 3), (1, obj_r - 3), (1, 0)], lens,
            loc=(x1 - 8, 0, z), segs=48)
    # turret housing + turrets
    mid = x0 + e + (L - e - o) * 0.45
    C.lathe(name + "Saddle", [(-24, tube_r), (-18, tube_r + 6), (18, tube_r + 6), (24, tube_r)], body,
            loc=(mid, 0, z), segs=64)
    C.lathe(name + "Elev", [(0, 0), (0, 13), (6, 13), (6, 15), (17, 15), (18, 14), (18, 0)], body,
            loc=(mid, 0, z + tube_r + 2), rot=(0, -90, 0), segs=32)
    C.lathe(name + "Wind", [(0, 0), (0, 13), (6, 13), (6, 15), (17, 15), (18, 14), (18, 0)], body,
            loc=(mid, -(tube_r + 2), z), rot=(0, 0, -90), segs=32)
    C.lathe(name + "Parallax", [(0, 0), (0, 11), (12, 11), (12, 0)], body,
            loc=(mid, tube_r + 2, z), rot=(0, 0, 90), segs=32)
    # knurling ribs on turrets
    ribs = []
    for i in range(24):
        a = 2 * math.pi * i / 24
        cx, cy = 15.2 * math.cos(a), 15.2 * math.sin(a)
        ribs.append((mid + cx - 0.6, mid + cx + 0.6, cy - 0.6, cy + 0.6, z + tube_r + 9, z + tube_r + 19))
    C.boxes(name + "ElevKnurl", ribs, body, bevel=0.0)
    # power ring ribs
    C.lathe(name + "PowerRing", [(0, eye_r + 0.5), (0, eye_r + 1.6), (14, eye_r + 1.6), (14, eye_r + 0.5)],
            M.rubber(), loc=(x0 + e * 0.58, 0, z), segs=48, closed=True)
    return mid


def scope_ring(name, x, z_rail, z_tube, tube_r, mat, width=20.0):
    C.tube(name, tube_r, tube_r + 4, x - width / 2, x + width / 2, mat, z=z_tube, segs=48)
    C.xsec(name + "Base", [(-12, z_rail), (12, z_rail), (10, z_tube - tube_r + 1), (-10, z_tube - tube_r + 1)],
           x - width / 2, x + width / 2, mat, bevel=0.5)
    C.cyl(name + "Bolt", 3.5, 0, 6, mat, y=-12, z=z_rail + 4, rot=(0, 0, -90), segs=6, bevel=0.2)


def muzzle_bore(name, x, r, z, depth=12.0):
    """Dark disc giving the illusion of a deep bore."""
    return C.cyl(name, r, x - depth, x + 0.05, M.bore(), z=z, segs=24, bevel=0)


def screw_head(name, x, y, z, r, mat, axis="Y", slot=True):
    rot = {"Y": (0, 0, 90 if y >= 0 else -90), "Z": (0, -90, 0), "X": None}[axis]
    return C.lathe(name, [(0, 0), (0, r), (0.6, r), (1.2, r * 0.8), (1.2, 0)], mat,
                   loc=(x, y, z), rot=rot, segs=16)


def curved_mag_pts(x_rear, z_top, depth, R, theta, n=16, extra_top=6.0):
    """Side outline of a curved box magazine (curving forward as it goes down).

    The rear edge is an arc of radius R whose centre lies level with z_top,
    R mm in front of x_rear; the front edge is concentric (radius R - depth).
    """
    cx, cz = x_rear + R, z_top
    rear, front = [], []
    for i in range(n + 1):
        t = theta * i / n
        rear.append((cx - R * math.cos(t), cz - R * math.sin(t)))
        front.append((cx - (R - depth) * math.cos(t), cz - (R - depth) * math.sin(t)))
    pts = [(x_rear, z_top + extra_top)] + rear + list(reversed(front)) + [(x_rear + depth, z_top + extra_top)]
    return pts, (cx, cz)


def curved_mag(name, x_rear, z_top, depth, R, theta, width, mat, ribs=True, base_mat=None):
    pts, (cx, cz) = curved_mag_pts(x_rear, z_top, depth, R, theta)
    body = C.profile(name, pts, width, mat, bevel=0.8)
    # floor plate at the bottom end, oriented along the arc normal
    t = theta
    r0, r1 = R + 3, R - depth - 3
    ca, sa = math.cos(t), math.sin(t)
    t2 = theta - 0.035
    c2, s2 = math.cos(t2), math.sin(t2)
    base = [(cx - r0 * ca, cz - r0 * sa), (cx - r1 * ca, cz - r1 * sa),
            (cx - r1 * c2, cz - r1 * s2), (cx - r0 * c2, cz - r0 * s2)]
    C.profile(name + "Floorplate", base, width + 3, base_mat or mat, bevel=0.8)
    if ribs:
        # pressed reinforcement ribs following the curve on both sides
        for s in (-1, 1):
            rib = []
            r_mid = R - depth * 0.5
            inner = []
            for i in range(13):
                tt = 0.06 + (theta - 0.12) * i / 12
                rib.append((cx - (r_mid + 4) * math.cos(tt), cz - (r_mid + 4) * math.sin(tt)))
                inner.append((cx - (r_mid - 4) * math.cos(tt), cz - (r_mid - 4) * math.sin(tt)))
            C.profile(name + "Rib%s" % ("L" if s > 0 else "R"), rib + list(reversed(inner)), 1.6, mat,
                      y=s * (width / 2 + 0.6), bevel=0.6)
    return body
