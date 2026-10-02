"""Procedural great white shark for Blender.

Builds the body by lofting cross-sections, adds airfoil-shaped fins, eyes,
gill slits and mouth, sets up an underwater scene and renders it with Cycles.

Run inside Blender:   blender -b -P shark.py
or with the bpy module: python3 shark.py [--samples N] [--res WxH]
"""

import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))

# Body runs along X from the snout (+2) to the tail (-2).
NOSE_X, TAIL_X = 2.0, -2.0
BODY_LEN = NOSE_X - TAIL_X

# (t, half-height, half-width, centre z); t = 0 at snout, 1 at tail.
PROFILE = [
    (0.000, 0.000, 0.000, -0.020),
    (0.015, 0.070, 0.080, -0.030),
    (0.050, 0.150, 0.165, -0.020),
    (0.120, 0.245, 0.250, 0.000),
    (0.220, 0.320, 0.300, 0.020),
    (0.350, 0.360, 0.320, 0.020),
    (0.500, 0.330, 0.280, 0.020),
    (0.650, 0.240, 0.190, 0.020),
    (0.780, 0.140, 0.100, 0.030),
    (0.880, 0.085, 0.065, 0.040),
    (0.950, 0.070, 0.068, 0.050),
    (1.000, 0.030, 0.030, 0.050),
]


def catmull_rom(points, t):
    """Catmull-Rom interpolation of tuples (t, a, b, c...) at parameter t."""
    ts = [p[0] for p in points]
    t = min(max(t, ts[0]), ts[-1])
    i = max(j for j in range(len(ts) - 1) if ts[j] <= t) if t < ts[-1] else len(ts) - 2
    p0 = points[max(i - 1, 0)]
    p1, p2 = points[i], points[i + 1]
    p3 = points[min(i + 2, len(points) - 1)]
    u = (t - p1[0]) / (p2[0] - p1[0])
    out = []
    for k in range(1, len(p1)):
        a, b, c, d = p0[k], p1[k], p2[k], p3[k]
        out.append(0.5 * ((2 * b) + (-a + c) * u
                          + (2 * a - 5 * b + 4 * c - d) * u * u
                          + (-a + 3 * b - 3 * c + d) * u ** 3))
    return out


def body_point(x, theta, inflate=0.0):
    """Point on the body surface at station x and angle theta (0 = +Y side)."""
    t = (NOSE_X - x) / BODY_LEN
    h, w, zc = catmull_rom(PROFILE, t)
    h, w = max(h, 0.0) + inflate, max(w, 0.0) + inflate
    s, c = math.sin(theta), math.cos(theta)
    z = h * math.copysign(abs(s) ** 0.9, s)
    if s < 0:
        z *= 0.85  # flatter belly
    return Vector((x, w * c, zc + z))


def body_lateral_offset(x):
    """Gentle S-curve so the shark looks like it is swimming."""
    t = (NOSE_X - x) / BODY_LEN
    return 0.06 * math.sin(t * math.pi * 1.2) - 0.32 * max(t - 0.3, 0.0) ** 2


# --------------------------------------------------------------------------
# Scene helpers
# --------------------------------------------------------------------------

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mesh_object(name, verts, faces):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def build_body(rings=90, segs=40):
    verts, faces = [], []
    xs = [NOSE_X - BODY_LEN * (i / (rings + 1)) ** 1.15 for i in range(1, rings + 1)]
    verts.append(body_point(NOSE_X, 0))
    for x in xs:
        for j in range(segs):
            verts.append(body_point(x, 2 * math.pi * j / segs))
    verts.append(Vector((TAIL_X, 0, PROFILE[-1][3])))
    tail = len(verts) - 1
    for j in range(segs):
        faces.append((0, 1 + (j + 1) % segs, 1 + j))
    for i in range(rings - 1):
        a, b = 1 + i * segs, 1 + (i + 1) * segs
        for j in range(segs):
            jn = (j + 1) % segs
            faces.append((a + j, a + jn, b + jn, b + j))
    last = 1 + (rings - 1) * segs
    for j in range(segs):
        faces.append((last + j, last + (j + 1) % segs, tail))
    return mesh_object("Body", verts, faces)


def build_fin(name, root, chord_dir, span_dir, root_chord, tip_chord, span,
              sweep, thick=0.10, n_s=14, n_c=20, droop=0.0):
    """Loft a tapered, swept airfoil fin. The root is sunk into the body."""
    chord_dir = Vector(chord_dir).normalized()
    span_dir = Vector(span_dir).normalized()
    normal = chord_dir.cross(span_dir).normalized()
    root = Vector(root)
    verts, faces = [], []
    ss = [-0.12 + 1.12 * (i / (n_s - 1)) for i in range(n_s)]
    for s in ss:
        sc = max(s, 0.0)
        le = root + span_dir * span * s + chord_dir * (sweep * sc ** 1.5) \
            + normal * (droop * sc * sc)
        c = tip_chord + (root_chord - tip_chord) * (1 - sc) ** 1.1
        th = thick * c * (1 - 0.6 * sc)
        for k in range(n_c):
            phi = 2 * math.pi * k / n_c
            u = (1 - math.cos(phi)) / 2
            v = 2.6 * th * math.sqrt(u) * (1 - u) * (1 if phi < math.pi else -1)
            verts.append(le + chord_dir * u * c + normal * v)
    tip = root + span_dir * span * 1.03 + chord_dir * (sweep + tip_chord * 0.4) \
        + normal * droop
    verts.append(tip)
    for i in range(n_s - 1):
        a, b = i * n_c, (i + 1) * n_c
        for k in range(n_c):
            kn = (k + 1) % n_c
            faces.append((a + k, b + k, b + kn, a + kn))
    last = (n_s - 1) * n_c
    for k in range(n_c):
        faces.append((last + k, len(verts) - 1, last + (k + 1) % n_c))
    obj = mesh_object(name, verts, faces)
    return obj


def surface_curve(name, pts, radius, material):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(pts) - 1)
    for p, co in zip(spline.points, pts):
        p.co = (co.x, co.y, co.z, 1.0)
    # Taper the ends of the slit.
    n = len(pts)
    for i, p in enumerate(spline.points):
        p.radius = math.sin(math.pi * (i + 0.5) / n) ** 0.5
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------

def skin_material():
    mat = bpy.data.materials.new("SharkSkin")
    mat.use_nodes = True
    nt = mat.node_tree
    nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.42
    bsdf.inputs["Specular IOR Level"].default_value = 0.45
    bsdf.inputs["Coat Weight"].default_value = 0.15
    bsdf.inputs["Coat Roughness"].default_value = 0.25

    coord = nodes.new("ShaderNodeTexCoord")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    links.new(coord.outputs["Object"], sep.inputs[0])
    geo = nodes.new("ShaderNodeNewGeometry")
    sepn = nodes.new("ShaderNodeSeparateXYZ")
    links.new(geo.outputs["Normal"], sepn.inputs[0])

    # Wavy countershading boundary: z + 0.55*normal.z + noise.
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.2
    noise.inputs["Detail"].default_value = 4.0
    links.new(coord.outputs["Object"], noise.inputs["Vector"])
    n_off = nodes.new("ShaderNodeMath")
    n_off.operation = "MULTIPLY_ADD"
    n_off.inputs[1].default_value = 0.16
    n_off.inputs[2].default_value = -0.08
    links.new(noise.outputs["Fac"], n_off.inputs[0])

    nz = nodes.new("ShaderNodeMath")
    nz.operation = "MULTIPLY_ADD"
    nz.inputs[1].default_value = 0.55
    links.new(sepn.outputs["Z"], nz.inputs[0])
    links.new(sep.outputs["Z"], nz.inputs[2])
    total = nodes.new("ShaderNodeMath")
    total.operation = "ADD"
    links.new(nz.outputs[0], total.inputs[0])
    links.new(n_off.outputs[0], total.inputs[1])

    ramp = nodes.new("ShaderNodeValToRGB")
    mr = nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.35
    mr.inputs["From Max"].default_value = 0.25
    links.new(total.outputs[0], mr.inputs["Value"])
    links.new(mr.outputs[0], ramp.inputs["Fac"])
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.40, (0.86, 0.86, 0.84, 1)
    el[1].position, el[1].color = 0.50, (0.20, 0.24, 0.28, 1)
    top = ramp.color_ramp.elements.new(0.95)
    top.color = (0.11, 0.13, 0.16, 1)

    # Fine skin mottling.
    mott = nodes.new("ShaderNodeTexNoise")
    mott.inputs["Scale"].default_value = 28.0
    mott.inputs["Detail"].default_value = 6.0
    links.new(coord.outputs["Object"], mott.inputs["Vector"])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.18
    links.new(ramp.outputs["Color"], mix.inputs["A"])
    links.new(mott.outputs["Color"], mix.inputs["B"])
    links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])

    # Dermal-denticle bump.
    vor = nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 260.0
    links.new(coord.outputs["Object"], vor.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.002
    links.new(vor.outputs["Distance"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def simple_material(name, color, roughness=0.5, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    return mat


def sand_material():
    mat = bpy.data.materials.new("Sand")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.95
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.5
    noise.inputs["Detail"].default_value = 8.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.12, 0.14, 0.12, 1)
    ramp.color_ramp.elements[1].color = (0.32, 0.31, 0.25, 1)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 1.2
    wave.inputs["Distortion"].default_value = 6.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.4
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# --------------------------------------------------------------------------
# Shark assembly
# --------------------------------------------------------------------------

def build_shark():
    skin = skin_material()
    dark = simple_material("Slit", (0.015, 0.015, 0.018), 0.6)
    eye_mat = simple_material("Eye", (0.005, 0.005, 0.006), 0.05, coat=1.0)

    parts = [build_body()]
    for side in (1, -1):
        parts.append(build_fin(f"Pectoral.{side}", (0.78, 0.17 * side, -0.15),
                               (-1, 0, -0.08), (-0.30, 0.85 * side, -0.42),
                               0.62, 0.07, 1.05, 0.38, thick=0.08, droop=0.0))
        parts.append(build_fin(f"Pelvic.{side}", (-0.55, 0.07 * side, -0.15),
                               (-1, 0, 0), (-0.45, 0.55 * side, -0.70),
                               0.26, 0.05, 0.30, 0.12, thick=0.08))
    parts.append(build_fin("Dorsal", (0.48, 0, 0.26), (-1, 0, 0), (-0.22, 0, 1),
                           0.78, 0.08, 0.78, 0.40, thick=0.09))
    parts.append(build_fin("Dorsal2", (-1.22, 0, 0.09), (-1, 0, 0), (-0.4, 0, 1),
                           0.14, 0.03, 0.10, 0.05, thick=0.1))
    parts.append(build_fin("Anal", (-1.28, 0, -0.02), (-1, 0, 0), (-0.4, 0, -1),
                           0.13, 0.03, 0.10, 0.05, thick=0.1))
    parts.append(build_fin("CaudalUpper", (-1.78, 0, 0.05), (-1, 0, 0.05),
                           (-0.55, 0, 0.84), 0.46, 0.05, 1.02, 0.30, thick=0.08))
    parts.append(build_fin("CaudalLower", (-1.78, 0, 0.02), (-1, 0, -0.05),
                           (-0.42, 0, -0.91), 0.42, 0.05, 0.82, 0.24, thick=0.08))

    # Join everything into one mesh so the material uses one coordinate space.
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    shark = parts[0]
    shark.name = "Shark"
    shark.data.materials.append(skin)

    # Swimming curve.
    for v in shark.data.vertices:
        v.co.y += body_lateral_offset(v.co.x)

    for poly in shark.data.polygons:
        poly.use_smooth = True
    sub = shark.modifiers.new("Subsurf", "SUBSURF")
    sub.levels, sub.render_levels = 2, 2

    details = []
    # Eyes.
    for side in (1, -1):
        p = body_point(1.60, 0.28 * side if side > 0 else math.pi - 0.28)
        p.y += body_lateral_offset(p.x) - 0.012 * side
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.034, location=p,
                                             segments=32, ring_count=16)
        eye = bpy.context.active_object
        eye.name = f"Eye.{side}"
        eye.data.materials.append(eye_mat)
        bpy.ops.object.shade_smooth()
        details.append(eye)

    # Gill slits: five curved slits on each side.
    for side in (1, -1):
        for k in range(5):
            x0 = 1.10 - k * 0.075
            pts = []
            for i in range(12):
                a = -0.55 + 1.05 * i / 11
                theta = a if side > 0 else math.pi - a
                x = x0 - 0.04 * a
                p = body_point(x, theta, inflate=-0.004)
                p.y += body_lateral_offset(p.x)
                pts.append(p)
            details.append(surface_curve(f"Gill.{side}.{k}", pts, 0.009, dark))

    # Mouth line on the underside of the snout.
    pts = []
    for i in range(25):
        a = -1 + 2 * i / 24
        theta = -math.pi / 2 + 0.95 * a
        x = 1.70 - 0.24 * a * a
        p = body_point(x, theta, inflate=-0.003)
        p.y += body_lateral_offset(p.x)
        pts.append(p)
    details.append(surface_curve("Mouth", pts, 0.010, dark))

    for d in details:
        d.parent = shark
    return shark


# --------------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------------

def build_environment():
    scene = bpy.context.scene

    world = bpy.data.worlds.new("Ocean")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.6
    mr.inputs["From Max"].default_value = 0.9
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].color = (0.002, 0.012, 0.025, 1)
    ramp.color_ramp.elements[1].color = (0.05, 0.30, 0.42, 1)
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0

    # Sea floor.
    bpy.ops.mesh.primitive_plane_add(size=300, location=(0, 0, -2.4))
    floor = bpy.context.active_object
    floor.name = "SeaFloor"
    floor.data.materials.append(sand_material())

    # Water volume for depth haze.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2))
    water = bpy.context.active_object
    water.name = "Water"
    water.scale = (300, 300, 13)
    vol = bpy.data.materials.new("WaterVolume")
    vol.use_nodes = True
    vnt = vol.node_tree
    vnt.nodes.remove(vnt.nodes["Principled BSDF"])
    pv = vnt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Color"].default_value = (0.06, 0.30, 0.42, 1)
    pv.inputs["Density"].default_value = 0.05
    pv.inputs["Absorption Color"].default_value = (0.25, 0.60, 0.75, 1)
    vnt.links.new(pv.outputs[0], vnt.nodes["Material Output"].inputs["Volume"])
    water.data.materials.append(vol)
    water.visible_shadow = False

    # Sunlight from the surface, plus a soft fill.
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.0
    sun_data.color = (0.80, 0.95, 1.0)
    sun_data.angle = math.radians(4)
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(20), math.radians(-15), math.radians(30))
    scene.collection.objects.link(sun)

    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 80
    fill_data.size = 4
    fill_data.color = (0.55, 0.85, 1.0)
    fill = bpy.data.objects.new("Fill", fill_data)
    fill.location = (4.0, -3.5, -0.8)
    fill.rotation_euler = Vector((-4.0, 3.5, 1.0)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(fill)

    rim_data = bpy.data.lights.new("Rim", "AREA")
    rim_data.energy = 150
    rim_data.size = 3
    rim_data.color = (0.7, 0.95, 1.0)
    rim = bpy.data.objects.new("Rim", rim_data)
    rim.location = (-3.0, 3.0, 2.5)
    rim.rotation_euler = Vector((3.0, -3.0, -2.5)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(rim)

    # Camera: three-quarter front view.
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 40
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = 5.6
    cam = bpy.data.objects.new("Camera", cam_data)
    cam.location = (3.6, -4.3, 0.75)
    target = Vector((-0.05, 0.0, 0.05))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.dof.focus_distance = (Vector((0.9, 0, 0)) - cam.location).length
    scene.collection.objects.link(cam)
    scene.camera = cam


def setup_render(samples, res):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.volume_step_rate = 4.0
    scene.cycles.max_bounces = 6
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.3
    scene.render.image_settings.file_format = "PNG"


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--res", default="1920x1080")
    ap.add_argument("--out", default=os.path.join(HERE, "shark_render.png"))
    ap.add_argument("--blend", default=os.path.join(HERE, "shark.blend"))
    ap.add_argument("--no-render", action="store_true")
    args = ap.parse_args(argv)

    reset_scene()
    build_shark()
    build_environment()
    setup_render(args.samples, tuple(int(v) for v in args.res.split("x")))

    bpy.ops.wm.save_as_mainfile(filepath=args.blend)
    if not args.no_render:
        bpy.context.scene.render.filepath = args.out
        bpy.ops.render.render(write_still=True)
        print("Rendered", args.out)


if __name__ == "__main__":
    main()
