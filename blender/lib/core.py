"""Low-level modeling helpers.

All dimensions passed to these helpers are in millimetres; Blender scene
units are metres, so everything is scaled by MM on the way in.

Weapon space convention: +X is the muzzle direction, +Z is up, so the
weapon's right side (ejection side) faces -Y.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

MM = 0.001

_state = {"coll": None, "root": None, "cutters": []}


# ---------------------------------------------------------------------------
# Scene / collection management
# ---------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def begin_asset(name, parent_coll=None):
    """Start a new asset: a collection plus a root empty all parts parent to."""
    coll = bpy.data.collections.new(name)
    (parent_coll or bpy.context.scene.collection).children.link(coll)
    root = bpy.data.objects.new(name, None)
    root.empty_display_type = "ARROWS"
    root.empty_display_size = 0.05
    coll.objects.link(root)
    _state["coll"] = coll
    _state["root"] = root
    return root


def end_asset():
    """Add the deferred bevel modifiers and set up smoothing on every part."""
    coll = _state["coll"]
    for obj in coll.objects:
        if obj.type != "MESH":
            continue
        me = obj.data
        if obj.get("skip_finalize"):
            continue
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(obj.get("sharp", 32.0)))
        bevel = obj.get("bevel", 0.0)
        if bevel > 0:
            mod = obj.modifiers.new("Bevel", "BEVEL")
            mod.width = bevel * MM
            mod.segments = int(obj.get("bevel_segs", 2))
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(30)
            mod.use_clamp_overlap = True
            mod.harden_normals = True
            mod.miter_outer = "MITER_ARC"
        wn = obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
        wn.keep_sharp = True
    root = _state["root"]
    _state["coll"] = None
    _state["root"] = None
    return root


def _finish(name, bm, mat, bevel=0.4, segs=2, loc=None, parent=True):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    _state["coll"].objects.link(obj)
    if parent and _state["root"] is not None:
        obj.parent = _state["root"]
    if mat is not None:
        me.materials.append(mat)
    if loc is not None:
        obj.location = Vector(loc) * MM
    obj["bevel"] = bevel
    obj["bevel_segs"] = segs
    return obj


# ---------------------------------------------------------------------------
# Primitive builders (all in mm)
# ---------------------------------------------------------------------------

def _clean_pts(pts):
    out = []
    for p in pts:
        if not out or (abs(p[0] - out[-1][0]) > 1e-6 or abs(p[1] - out[-1][1]) > 1e-6):
            out.append(tuple(p))
    if len(out) > 2 and abs(out[0][0] - out[-1][0]) < 1e-6 and abs(out[0][1] - out[-1][1]) < 1e-6:
        out.pop()
    return out


def _bm_prism(bm, pts, axis_from, axis_to, plane):
    """Extrude closed 2D polygon `pts` between two offsets along an axis.

    plane: "XZ" (extrude along Y) or "YZ" (extrude along X).
    """
    pts = _clean_pts(pts)

    def v3(a, b, d):
        if plane == "XZ":
            return (a * MM, d * MM, b * MM)
        return (d * MM, a * MM, b * MM)

    v0 = [bm.verts.new(v3(a, b, axis_from)) for a, b in pts]
    v1 = [bm.verts.new(v3(a, b, axis_to)) for a, b in pts]
    n = len(pts)
    bm.faces.new(v0)
    bm.faces.new(list(reversed(v1)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v0[i], v0[j], v1[j], v1[i]))


def profile(name, pts, thick, mat, y=0.0, bevel=0.5, segs=2):
    """Side-view (X,Z) polygon extruded symmetrically along Y around `y`."""
    bm = bmesh.new()
    _bm_prism(bm, pts, y - thick / 2, y + thick / 2, "XZ")
    return _finish(name, bm, mat, bevel, segs)


def xsec(name, pts_yz, x0, x1, mat, bevel=0.5, segs=2):
    """Cross-section (Y,Z) polygon extruded along X from x0 to x1."""
    bm = bmesh.new()
    _bm_prism(bm, pts_yz, x0, x1, "YZ")
    return _finish(name, bm, mat, bevel, segs)


def _bm_box(bm, x0, x1, y0, y1, z0, z1):
    _bm_prism(bm, [(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y0, y1, "XZ")


def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=0.4, segs=2):
    bm = bmesh.new()
    _bm_box(bm, x0, x1, y0, y1, z0, z1)
    return _finish(name, bm, mat, bevel, segs)


def boxes(name, specs, mat, bevel=0.3, segs=1):
    """Many boxes (x0,x1,y0,y1,z0,z1) merged into one object."""
    bm = bmesh.new()
    for s in specs:
        _bm_box(bm, *s)
    return _finish(name, bm, mat, bevel, segs)


def _bm_lathe(bm, pts, segs, closed):
    verts = [bm.verts.new((x * MM, 0.0, r * MM)) for x, r in pts]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    if closed:
        edges.append(bm.edges.new((verts[-1], verts[0])))
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(1, 0, 0),
                   angle=2 * math.pi, steps=segs, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)


def lathe(name, pts, mat, loc=(0, 0, 0), rot=None, segs=48, closed=False,
          bevel=0.0, segs_bevel=2, sharp=40.0):
    """Revolve (x, radius) profile around the local X axis.

    rot: optional (rx, ry, rz) euler in degrees to re-orient the axis.
    """
    bm = bmesh.new()
    _bm_lathe(bm, pts, segs, closed)
    obj = _finish(name, bm, mat, bevel, segs_bevel, loc=loc)
    if rot:
        obj.rotation_euler = [math.radians(a) for a in rot]
    obj["sharp"] = sharp
    return obj


def cyl(name, r, x0, x1, mat, y=0.0, z=0.0, segs=32, bevel=0.3, rot=None):
    """Solid cylinder along X from x0 to x1 (or re-oriented with rot about its start)."""
    return lathe(name, [(0, 0), (0, r), (x1 - x0, r), (x1 - x0, 0)], mat,
                 loc=(x0, y, z), rot=rot, segs=segs, bevel=bevel)


def tube(name, r_in, r_out, x0, x1, mat, y=0.0, z=0.0, segs=40, bevel=0.3, rot=None):
    L = x1 - x0
    return lathe(name, [(0, r_in), (0, r_out), (L, r_out), (L, r_in)], mat,
                 loc=(x0, y, z), rot=rot, segs=segs, closed=True, bevel=bevel)


def sphere(name, r, loc, mat, scale=(1, 1, 1), segs=32, rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r * MM)
    obj = _finish(name, bm, mat, 0.0, 1, loc=loc)
    obj.scale = scale
    return obj


def torus(name, R, r, loc, mat, rot=(0, 90, 0), segs=48, minor=12):
    """Torus whose ring lies in the plane perpendicular to X (after default rot)."""
    bm = bmesh.new()
    for i in range(segs):
        a = 2 * math.pi * i / segs
        for j in range(minor):
            b = 2 * math.pi * j / minor
            rr = R + r * math.cos(b)
            bm.verts.new((rr * math.cos(a) * MM, rr * math.sin(a) * MM, r * math.sin(b) * MM))
    bm.verts.ensure_lookup_table()
    for i in range(segs):
        for j in range(minor):
            a = i * minor + j
            b = ((i + 1) % segs) * minor + j
            c = ((i + 1) % segs) * minor + (j + 1) % minor
            d = i * minor + (j + 1) % minor
            bm.faces.new((bm.verts[a], bm.verts[b], bm.verts[c], bm.verts[d]))
    obj = _finish(name, bm, mat, 0.0, 1, loc=loc)
    obj.rotation_euler = [math.radians(v) for v in rot]
    obj["sharp"] = 80.0
    return obj


# ---------------------------------------------------------------------------
# 2D shape helpers (return lists of (a, b) points)
# ---------------------------------------------------------------------------

def rrect(a0, a1, b0, b1, r, n=4):
    """Rounded rectangle polygon."""
    r = min(r, (a1 - a0) / 2, (b1 - b0) / 2)
    pts = []
    corners = [(a1 - r, b0 + r, -90), (a1 - r, b1 - r, 0), (a0 + r, b1 - r, 90), (a0 + r, b0 + r, 180)]
    for ca, cb, start in corners:
        for i in range(n + 1):
            t = math.radians(start + 90 * i / n)
            pts.append((ca + r * math.cos(t), cb + r * math.sin(t)))
    return pts


def circle(ca, cb, r, n=24, start=0.0, end=360.0):
    pts = []
    for i in range(n + (0 if end - start >= 360 else 1)):
        t = math.radians(start + (end - start) * i / n)
        pts.append((ca + r * math.cos(t), cb + r * math.sin(t)))
    return pts


def round_top_xsec(half_w, z0, z1, top_r, n=6, bottom_r=0.0):
    """Cross-section (Y,Z): flat sides, rounded upper corners."""
    pts = []
    if bottom_r > 0:
        pts += circle(-half_w + bottom_r, z0 + bottom_r, bottom_r, n, 180, 270)
        pts += circle(half_w - bottom_r, z0 + bottom_r, bottom_r, n, 270, 360)
    else:
        pts += [(-half_w, z0), (half_w, z0)]
    pts += circle(half_w - top_r, z1 - top_r, top_r, n, 0, 90)
    pts += circle(-half_w + top_r, z1 - top_r, top_r, n, 90, 180)
    return pts


def chamfer_xsec(half_w, z0, z1, ch_top, ch_bot=0.0):
    pts = [(-half_w + ch_bot, z0), (half_w - ch_bot, z0), (half_w, z0 + ch_bot),
           (half_w, z1 - ch_top), (half_w - ch_top, z1), (-half_w + ch_top, z1),
           (-half_w, z1 - ch_top), (-half_w, z0 + ch_bot)]
    return pts


def bumpy_line(p0, p1, n_bumps, amp, steps_per=6, side=1.0):
    """Points from p0 to p1 with rounded bumps (finger grooves) pushed sideways."""
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dz)
    nx, nz = -dz / L * side, dx / L * side
    pts = []
    total = n_bumps * steps_per
    for i in range(total + 1):
        t = i / total
        off = amp * abs(math.sin(math.pi * n_bumps * t))
        pts.append((p0[0] + dx * t + nx * off, p0[1] + dz * t + nz * off))
    return pts


def bezier(p0, p1, p2, n=10, include_start=True):
    """Quadratic bezier points."""
    out = []
    for i in range(0 if include_start else 1, n + 1):
        t = i / n
        a = (1 - t) ** 2
        b = 2 * (1 - t) * t
        c = t ** 2
        out.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    return out


# ---------------------------------------------------------------------------
# Booleans / modifier application
# ---------------------------------------------------------------------------

def apply_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    me.name = old.name
    bpy.data.meshes.remove(old)


def boolean(target, cutters, op="DIFFERENCE"):
    """Apply boolean(s) immediately and delete the cutter objects."""
    if not isinstance(cutters, (list, tuple)):
        cutters = [cutters]
    for c in cutters:
        m = target.modifiers.new("Bool", "BOOLEAN")
        m.operation = op
        m.solver = "EXACT"
        m.object = c
        c.display_type = "WIRE"
    apply_modifiers(target)
    for c in cutters:
        me = c.data
        bpy.data.objects.remove(c)
        bpy.data.meshes.remove(me)
    return target


def intersect(target, other):
    return boolean(target, other, "INTERSECT")


def union(target, others):
    return boolean(target, others, "UNION")


def cutter_boxes(specs):
    bm = bmesh.new()
    for s in specs:
        _bm_box(bm, *s)
    return _finish("_cutter", bm, None, 0.0, 1)


def cutter_profile(pts, y0, y1):
    bm = bmesh.new()
    _bm_prism(bm, pts, y0, y1, "XZ")
    return _finish("_cutter", bm, None, 0.0, 1)


def cutter_cyl(r, x0, x1, y=0.0, z=0.0, rot=None, segs=32):
    o = cyl("_cutter", r, x0, x1, None, y=y, z=z, segs=segs, rot=rot, bevel=0)
    return o


def serrations(x0, pitch, count, z0, z1, depth, half_w, width=1.2, slant=0.0, sides=(-1, 1)):
    """Cutter for vertical slide serrations on both sides."""
    bm = bmesh.new()
    for s in sides:
        y_out = s * (half_w + 2)
        y_in = s * (half_w - depth)
        y0, y1 = sorted((y_in, y_out))
        for i in range(count):
            x = x0 + i * pitch
            pts = [(x, z0), (x + width, z0), (x + width + slant, z1), (x + slant, z1)]
            _bm_prism(bm, pts, y0, y1, "XZ")
    return _finish("_cutter", bm, None, 0.0, 1)


def rotate_about_x(obj, deg, z, y=0.0):
    """Rotate an object (built in weapon space) about the X-parallel axis through (y, z) mm."""
    a = math.radians(deg)
    obj.rotation_euler = (a, 0, 0)
    cy, cz = y * MM, z * MM
    # location so that the pivot point maps onto itself
    obj.location = (0.0, cy - (cy * math.cos(a) - cz * math.sin(a)), cz - (cy * math.sin(a) + cz * math.cos(a)))
    return obj


def mirror_y(obj, name=None):
    """Duplicate an object mirrored across the XZ plane."""
    me = obj.data.copy()
    me.transform(Matrix.Scale(-1, 4, (0, 1, 0)))
    me.flip_normals()
    new = obj.copy()
    new.data = me
    new.name = name or obj.name + ".R"
    new.location.y = -obj.location.y
    obj.users_collection[0].objects.link(new)
    return new


def set_parent_keep(child, parent):
    child.parent = parent


def collection_objects():
    return list(_state["coll"].objects)
