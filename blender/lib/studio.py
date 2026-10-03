"""Preview-render studio: backdrop, three-point lighting, auto-framing camera."""
import math

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

STUDIO = "_Studio"


def _studio_coll(scene):
    coll = bpy.data.collections.get(STUDIO)
    if coll is None:
        coll = bpy.data.collections.new(STUDIO)
        scene.collection.children.link(coll)
    return coll


def cleanup(scene):
    coll = bpy.data.collections.get(STUDIO)
    if coll is None:
        return
    for obj in list(coll.objects):
        data = obj.data
        bpy.data.objects.remove(obj)
        if data is not None and data.users == 0:
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Light):
                bpy.data.lights.remove(data)
            elif isinstance(data, bpy.types.Camera):
                bpy.data.cameras.remove(data)
    bpy.data.collections.remove(coll)


def setup_render(scene, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.max_bounces = 8
    try:
        scene.cycles.use_denoising = True
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:  # pragma: no cover - depends on build
        pass
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.file_format = "PNG"
    world = bpy.data.worlds.get("StudioWorld") or bpy.data.worlds.new("StudioWorld")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.55, 0.57, 0.6, 1)
    bg.inputs["Strength"].default_value = 0.12
    scene.world = world


def _mat(name, color, rough=0.6):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*color, 1)
        b.inputs["Roughness"].default_value = rough
    return m


def _cyclorama(coll, center, size, floor_z, wall_y):
    """Floor + curved back wall (a single bent plane), wall towards +Y."""
    import bmesh
    bm = bmesh.new()
    w = size * 4
    R = size * 0.6
    prof = [(-size * 4, floor_z)]
    for i in range(13):
        a = math.radians(-90 + 90 * i / 12)
        prof.append((wall_y - R + R * math.cos(a), floor_z + R + R * math.sin(a)))
    prof.append((wall_y, floor_z + size * 4))
    rows = []
    for yv, zv in [(p[0], p[1]) for p in prof]:
        rows.append([bm.verts.new((center.x - w, yv, zv)), bm.verts.new((center.x + w, yv, zv))])
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    me = bpy.data.meshes.new("Cyclorama")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new("Cyclorama", me)
    me.materials.append(_mat("Backdrop", (0.42, 0.43, 0.45), 0.8))
    coll.objects.link(obj)
    return obj


def _area(coll, name, loc, target, size, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size = size
    ld.size_y = size * 0.6
    ld.energy = energy
    ld.color = color
    obj = bpy.data.objects.new(name, ld)
    obj.location = loc
    obj.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    coll.objects.link(obj)
    return obj


def _bbox(roots):
    pts = []
    for r in roots:
        for o in r.children_recursive:
            if o.type == "MESH" and not o.name.startswith("_"):
                pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi, pts


def _frame_camera(scene, cam, pts, center, direction, fill=0.86):
    direction = direction.normalized()
    d = (max(pts, key=lambda p: (p - center).length) - center).length * 3.0
    cam.data.shift_x = cam.data.shift_y = 0.0
    for _ in range(12):
        cam.location = center - direction * d
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        ndc = [world_to_camera_view(scene, cam, p) for p in pts]
        xs = [v.x for v in ndc]
        ys = [v.y for v in ndc]
        ex = max(xs) - min(xs)
        ey = max(ys) - min(ys)
        scale = max(ex, ey) / fill
        d *= 1.0 + (scale - 1.0) * 0.9
    ndc = [world_to_camera_view(scene, cam, p) for p in pts]
    cx = (max(v.x for v in ndc) + min(v.x for v in ndc)) / 2 - 0.5
    cy = (max(v.y for v in ndc) + min(v.y for v in ndc)) / 2 - 0.5
    rx, ry = scene.render.resolution_x, scene.render.resolution_y
    aspect = rx / ry
    if aspect >= 1:
        cam.data.shift_x, cam.data.shift_y = cx, cy / aspect
    else:
        cam.data.shift_x, cam.data.shift_y = cx * aspect, cy


def _stage(scene, roots, all_roots, res, direction, character=False):
    cleanup(scene)
    coll = _studio_coll(scene)
    for r in all_roots:
        hide = r not in roots
        for o in [r] + list(r.children_recursive):
            o.hide_render = hide
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    lo, hi, pts = _bbox(roots)
    center = (lo + hi) / 2
    size = max(hi - lo)
    if character:
        _cyclorama(coll, center, size, lo.z, hi.y + size * 0.8)
    else:
        _cyclorama(coll, center, size, lo.z - size * 0.25, hi.y + size * 0.18)
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 85 if not character else 70
    cam_data.sensor_fit = "AUTO"
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    coll.objects.link(cam)
    scene.camera = cam
    _frame_camera(scene, cam, pts, center, direction)
    s = size
    # key (front-left-high), fill (front-right), rim (behind-top), top softbox
    _area(coll, "Key", center + Vector((-0.9 * s, -1.2 * s, 1.1 * s)), center, s * 1.1, 70 * s * s,
          (1.0, 0.96, 0.9))
    _area(coll, "Fill", center + Vector((1.3 * s, -1.0 * s, 0.3 * s)), center, s * 1.4, 22 * s * s,
          (0.85, 0.92, 1.0))
    _area(coll, "Rim", center + Vector((0.4 * s, 0.9 * s, 0.9 * s)), center, s * 0.8, 80 * s * s)
    _area(coll, "Top", center + Vector((0.0, -0.2 * s, 1.4 * s)), center, s * 1.6, 30 * s * s)
    return cam


def render_asset(scene, root, all_roots, path):
    character = root.name.startswith("CT_")
    if character:
        res = (1200, 1500)
        direction = Vector((-0.55, 1.0, -0.1))
    else:
        res = (1600, 900)
        direction = Vector((0.32, 1.0, -0.38))
    _stage(scene, [root], all_roots, res, direction, character)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("rendered", path)


LINEUP_ROWS = [["AWP"], ["AK47"], ["M4A4"], ["MP5SD", "MP9"], ["Glock18", "P250", "DesertEagle"]]


def render_lineup(scene, roots, all_roots, path):
    by_name = {r.name: r for r in roots}
    saved = {r: r.location.copy() for r in roots}
    z = 0.0
    for row in LINEUP_ROWS:
        items = [by_name[n] for n in row if n in by_name]
        if not items:
            continue
        x = 0.0
        row_h = 0.0
        for r in items:
            r.location = (0, 0, 0)
            bpy.context.view_layer.update()
            lo, hi, _ = _bbox([r])
            r.location = (x - lo.x, 0.0, z - hi.z)
            x += (hi.x - lo.x) + 0.08
            row_h = max(row_h, hi.z - lo.z)
        # centre the row
        for r in items:
            r.location.x -= (x - 0.08) / 2
        z -= row_h + 0.07
    bpy.context.view_layer.update()
    _stage(scene, roots, all_roots, (1600, 1600), Vector((0.08, 1.0, -0.12)))
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("rendered", path)
    for r, loc in saved.items():
        r.location = loc
    bpy.context.view_layer.update()
