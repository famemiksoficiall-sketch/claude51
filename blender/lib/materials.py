"""Procedural PBR materials (Principled BSDF + noise-driven wear).

Procedural nodes render in Blender (Cycles/EEVEE). The glTF exporter only
keeps the Principled base values, so each material's base color/roughness/
metallic are set to sensible averages too.
"""
import bpy

_cache = {}


def _base(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    return mat, nt, bsdf


def _link(nt, a, b):
    nt.links.new(a, b)


def _noise_rough(nt, bsdf, r_lo, r_hi, scale=60.0, detail=8.0):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = detail
    _link(nt, tc.outputs["Object"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.3
    ramp.inputs["From Max"].default_value = 0.7
    ramp.inputs["To Min"].default_value = r_lo
    ramp.inputs["To Max"].default_value = r_hi
    _link(nt, noise.outputs["Fac"], ramp.inputs["Value"])
    _link(nt, ramp.outputs["Result"], bsdf.inputs["Roughness"])
    return tc, noise


def _bump(nt, bsdf, tc, scale, strength, distance=0.0002, kind="noise"):
    if kind == "voronoi":
        tex = nt.nodes.new("ShaderNodeTexVoronoi")
        tex.feature = "F1"
        out = tex.outputs["Distance"]
    else:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Detail"].default_value = 4.0
        out = tex.outputs["Fac"]
    tex.inputs["Scale"].default_value = scale
    _link(nt, tc.outputs["Object"], tex.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = distance
    _link(nt, out, bump.inputs["Height"])
    _link(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])


def metal(name, color, rough=(0.25, 0.45), metallic=1.0):
    key = ("metal", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = sum(rough) / 2
    tc, _ = _noise_rough(nt, bsdf, rough[0], rough[1], scale=220.0, detail=4.0)
    nt.nodes[-1].inputs["To Min"].default_value = rough[0]
    _bump(nt, bsdf, tc, 900.0, 0.03)
    mat.diffuse_color = (*color, 1)
    _cache[key] = mat
    return mat


def polymer(name, color, rough=0.55, stipple=False):
    key = ("polymer", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = rough
    tc, _ = _noise_rough(nt, bsdf, rough - 0.08, rough + 0.08, scale=80.0)
    if stipple:
        _bump(nt, bsdf, tc, 1400.0, 0.6, 0.0004, kind="voronoi")
    else:
        _bump(nt, bsdf, tc, 1500.0, 0.05)
    mat.diffuse_color = (*color, 1)
    _cache[key] = mat
    return mat


def wood(name, dark=(0.13, 0.05, 0.02), light=(0.36, 0.15, 0.06)):
    key = ("wood", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (6.0, 60.0, 60.0)
    _link(nt, tc.outputs["Object"], mapping.inputs["Vector"])
    distort = nt.nodes.new("ShaderNodeTexNoise")
    distort.inputs["Scale"].default_value = 3.0
    distort.inputs["Detail"].default_value = 6.0
    _link(nt, mapping.outputs["Vector"], distort.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.inputs["Scale"].default_value = 1.5
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0
    _link(nt, mapping.outputs["Vector"], wave.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    _link(nt, wave.outputs["Fac"], ramp.inputs["Fac"])
    _link(nt, ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.42
    bsdf.inputs["Coat Weight"].default_value = 0.35
    bsdf.inputs["Coat Roughness"].default_value = 0.2
    _bump(nt, bsdf, tc, 300.0, 0.05)
    avg = tuple((d + l) / 2 for d, l in zip(dark, light))
    mat.diffuse_color = (*avg, 1)
    _cache[key] = mat
    return mat


def fabric(name, color, rough=0.85, scale=2500.0):
    key = ("fabric", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 18.0
    noise.inputs["Detail"].default_value = 6.0
    _link(nt, tc.outputs["Object"], noise.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (*[c * 0.75 for c in color], 1)
    mix.inputs["B"].default_value = (*[min(1.0, c * 1.2) for c in color], 1)
    _link(nt, noise.outputs["Fac"], mix.inputs["Factor"])
    _link(nt, mix.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Sheen Weight"].default_value = 0.0
    # woven micro-texture
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = scale / 10.0
    _link(nt, tc.outputs["Object"], wave.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.15
    _link(nt, wave.outputs["Fac"], bump.inputs["Height"])
    _link(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    mat.diffuse_color = (*color, 1)
    _cache[key] = mat
    return mat


def glass(name="Lens", tint=(0.35, 0.55, 0.45)):
    key = ("glass", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    bsdf.inputs["Base Color"].default_value = (*tint, 1)
    bsdf.inputs["Metallic"].default_value = 0.6
    bsdf.inputs["Roughness"].default_value = 0.02
    bsdf.inputs["Coat Weight"].default_value = 1.0
    mat.diffuse_color = (*tint, 1)
    _cache[key] = mat
    return mat


def emission(name, color, strength=4.0):
    key = ("emit", name)
    if key in _cache:
        return _cache[key]
    mat, nt, bsdf = _base(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    _cache[key] = mat
    return mat


class M:
    """Shared material palette, created lazily."""

    @staticmethod
    def gunmetal():
        return metal("Gunmetal", (0.045, 0.045, 0.05), (0.28, 0.5))

    @staticmethod
    def parkerized():
        return metal("Parkerized", (0.07, 0.07, 0.065), (0.45, 0.65), 0.85)

    @staticmethod
    def blued():
        return metal("BluedSteel", (0.035, 0.04, 0.055), (0.2, 0.35))

    @staticmethod
    def steel():
        return metal("Steel", (0.55, 0.55, 0.56), (0.18, 0.32))

    @staticmethod
    def stainless():
        return metal("Stainless", (0.62, 0.61, 0.6), (0.22, 0.38))

    @staticmethod
    def brass():
        return metal("Brass", (0.75, 0.55, 0.2), (0.2, 0.3))

    @staticmethod
    def bore():
        return metal("Bore", (0.01, 0.01, 0.01), (0.5, 0.7))

    @staticmethod
    def polymer_black():
        return polymer("PolymerBlack", (0.025, 0.025, 0.027), 0.55)

    @staticmethod
    def grip_black():
        return polymer("GripTexture", (0.03, 0.03, 0.032), 0.7, stipple=True)

    @staticmethod
    def polymer_green():
        return polymer("PolymerOD", (0.13, 0.16, 0.08), 0.6)

    @staticmethod
    def grip_green():
        return polymer("GripOD", (0.11, 0.14, 0.07), 0.75, stipple=True)

    @staticmethod
    def rubber():
        return polymer("Rubber", (0.02, 0.02, 0.02), 0.85, stipple=True)

    @staticmethod
    def ak_wood():
        return wood("WalnutAK")

    @staticmethod
    def bakelite():
        return polymer("Bakelite", (0.22, 0.06, 0.02), 0.35)

    @staticmethod
    def lens():
        return glass()

    @staticmethod
    def sight_dot():
        return emission("TritiumDot", (0.6, 1.0, 0.4), 6.0)

    @staticmethod
    def white_paint():
        return polymer("WhitePaint", (0.85, 0.85, 0.8), 0.4)
