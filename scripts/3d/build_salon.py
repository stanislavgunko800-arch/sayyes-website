# -*- coding: utf-8 -*-
"""Say Yes: интерьер салона в Blender (headless).

Запуск:  blender -b -P scripts/3d/build_salon.py
Результат:
  public/3d/salon.glb    — одна сетка + один запечённый атлас света (Draco)
  public/3d/camera.json  — путь камеры для прокрутки
  scripts/3d/preview.png — контрольный кадр

Техника, как у продакшн-студий для веба:
  1. моделирование примитивами с честными размерами (метры);
  2. один материал на объект, всё склеивается в одну сетку (1 draw call);
  3. UV-развёртка Smart Project в общий атлас;
  4. запекание света Cycles (прямой + непрямой + цвет + свечение) в текстуру;
  5. экспорт GLB со сжатием Draco; в браузере свет уже «внутри» текстуры.
"""
import bpy, math, json, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "3d")
os.makedirs(OUT, exist_ok=True)
ATLAS = int(os.environ.get("ATLAS", "2048"))
SAMPLES = int(os.environ.get("SAMPLES", "128"))

# ---------- палитра сайта ----------
PORCELAIN = (0.95, 0.94, 0.92)
PAPER = (0.84, 0.83, 0.80)
GREY = (0.62, 0.61, 0.58)
INK = (0.045, 0.035, 0.03)
BURGUNDY = (0.29, 0.045, 0.09)
SAGE = (0.30, 0.38, 0.33)
BRASS = (0.66, 0.65, 0.63)  # сатиновая сталь, без жёлтого


def lin(c):
    """sRGB 0..1 -> линейный"""
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(f(v) for v in c)


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
mats = {}


def mat(name, color, rough=0.7, emit=0.0):
    if name in mats:
        return mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(color), 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*lin(color), 1)
        b.inputs["Emission Strength"].default_value = emit
    mats[name] = m
    return m


parts = []


def add(obj, m):
    obj.data.materials.append(m)
    parts.append(obj)
    return obj


def box(name, size, loc, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    return add(o, m)


def cyl(name, r, h, loc, m, verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc)
    o = bpy.context.active_object
    o.name = name
    return add(o, m)


def sphere(name, r, loc, m, seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    return add(o, m)


def bevel(o, w=0.012):
    b = o.modifiers.new("bevel", "BEVEL")
    b.width = w
    b.segments = 3
    b.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=b.name)


# ---------- комната (8 x 7 x 3.4 м), передняя стена открыта ----------
W, D, H = 8.0, 7.0, 3.4
wall = mat("wall", PORCELAIN, 0.95)
floor = mat("floor", PAPER, 0.5)
dark = mat("ink", INK, 0.5)
wine = mat("burgundy", BURGUNDY, 0.45)
sage = mat("sage", SAGE, 0.8)
brass = mat("brass", BRASS, 0.35)
grey = mat("grey", GREY, 0.8)
glow = mat("glow", (1.0, 0.93, 0.82), 1.0, emit=4.0)
mirror_m = mat("mirror", (0.9, 0.93, 0.95), 0.15, emit=1.1)

box("floor", (W, D, 0.1), (0, 0, -0.05), floor)
box("back", (W, 0.2, H), (0, D / 2 + 0.1, H / 2), wall)
box("left", (0.2, D, H), (-W / 2 - 0.1, 0, H / 2), wall)
box("right", (0.2, D, H), (W / 2 + 0.1, 0, H / 2), wall)
box("ceiling", (W, D, 0.1), (0, 0, H + 0.05), wall)
box("plinth_b", (W, 0.05, 0.14), (0, D / 2 - 0.02, 0.07), dark)
box("plinth_l", (0.05, D, 0.14), (-W / 2 + 0.02, 0, 0.07), dark)
box("plinth_r", (0.05, D, 0.14), (W / 2 - 0.02, 0, 0.07), dark)

# арка-ниша на задней стене + неон-рамка
box("arch_back", (2.6, 0.06, 2.5), (0, D / 2 - 0.03, 1.25), wine)
bpy.ops.mesh.primitive_cylinder_add(radius=1.3, depth=0.03, vertices=96, location=(0, D / 2 - 0.03, 2.5), rotation=(math.radians(90), 0, 0))
parts_arch = bpy.context.active_object
parts_arch.name = "arch_top"
add(parts_arch, wine)

# ---------- бар слева ----------
bx, by = -2.2, 1.2
bar = box("bar", (3.6, 0.9, 1.05), (bx, by, 0.525), dark)
bevel(bar, 0.02)
box("bar_top", (3.8, 1.05, 0.08), (bx, by, 1.09), mat("marble", (0.92, 0.91, 0.89), 0.18))
box("bar_foot", (3.4, 0.7, 0.04), (bx, by - 0.05, 0.02), brass)
# задняя полка с бутылками
box("shelf1", (3.4, 0.3, 0.05), (bx, D / 2 - 0.2, 1.5), brass)
box("shelf2", (3.4, 0.3, 0.05), (bx, D / 2 - 0.2, 2.1), brass)
for i in range(14):
    x = bx - 1.55 + i * 0.238
    colr = [BURGUNDY, GREY, SAGE, PAPER, INK][i % 5]
    cyl(f"b1_{i}", 0.045, 0.3 + (i % 3) * 0.05, (x, D / 2 - 0.2, 1.7 + (i % 3) * 0.025), mat(f"bot{i%5}", colr, 0.3), 24)
    cyl(f"b2_{i}", 0.04, 0.22 + (i % 4) * 0.03, (x + 0.05, D / 2 - 0.2, 2.25 + (i % 4) * 0.015), mat(f"bot{(i+2)%5}", [PAPER, BURGUNDY, GREY, SAGE, INK][i % 5], 0.3), 24)
# кофемашина
box("coffee_m", (0.55, 0.45, 0.5), (bx + 1.0, by, 1.37), mat("steel", (0.6, 0.6, 0.62), 0.3))
cyl("cup1", 0.05, 0.08, (bx + 0.3, by + 0.1, 1.17), mat("cup", PORCELAIN, 0.2), 24)
cyl("cup2", 0.05, 0.08, (bx - 0.2, by - 0.15, 1.17), mat("cup", PORCELAIN, 0.2), 24)

# барные стулья
for i in range(4):
    sx = bx - 1.3 + i * 0.9
    cyl(f"st_leg{i}", 0.025, 0.7, (sx, by - 0.75, 0.38), brass, 16)
    cyl(f"st_seat{i}", 0.2, 0.07, (sx, by - 0.75, 0.74), wine, 40)
    cyl(f"st_base{i}", 0.17, 0.03, (sx, by - 0.75, 0.02), brass, 40)

# ---------- зона красоты справа: два кресла и зеркала ----------
for i, cy in enumerate((-0.7, 1.9)):
    cx = W / 2 - 1.1
    box(f"mir{i}", (0.05, 0.95, 1.9), (W / 2 - 0.04, cy, 1.55), mirror_m)
    box(f"mirf{i}", (0.07, 1.05, 2.0), (W / 2 - 0.05, cy, 1.55), brass)
    seat = box(f"ch_seat{i}", (0.7, 0.7, 0.16), (cx, cy, 0.62), wine)
    bevel(seat, 0.05)
    back = box(f"ch_back{i}", (0.12, 0.64, 0.95), (cx + 0.32, cy, 1.1), wine)
    bevel(back, 0.04)
    foot = box(f"ch_foot{i}", (0.28, 0.5, 0.06), (cx - 0.55, cy, 0.3), grey)
    cyl(f"ch_post{i}", 0.07, 0.5, (cx, cy, 0.3), brass, 24)
    cyl(f"ch_base{i}", 0.3, 0.05, (cx, cy, 0.03), dark, 40)
    box(f"trolley{i}", (0.35, 0.5, 0.7), (cx - 1.0, cy + 0.15, 0.4), mat("trolley", PORCELAIN, 0.4))

# ---------- растение, ковёр, подвесные лампы ----------
cyl("pot", 0.26, 0.5, (3.2, -2.6, 0.25), dark, 40)
for i, (dx, dy, dz, r) in enumerate([(0, 0, 1.0, 0.38), (0.22, 0.1, 1.45, 0.3), (-0.2, -0.1, 1.5, 0.28), (0.05, 0.2, 1.9, 0.24)]):
    sphere(f"leaf{i}", r, (3.2 + dx, -2.6 + dy, dz), sage)
cyl("rug", 1.6, 0.012, (-0.3, -1.4, 0.006), mat("rug", (0.66, 0.65, 0.62), 0.95), 96)
for i, (lx, ly) in enumerate([(-3.0, 1.2), (-2.2, 1.2), (-1.4, 1.2)]):
    cyl(f"cord{i}", 0.005, 1.4, (lx, ly, H - 0.7), dark, 8)
    sphere(f"lamp{i}", 0.17, (lx, ly, H - 1.45), glow)

# ---------- вывеска SAY YES ----------
bpy.ops.object.text_add(location=(0, D / 2 - 0.12, 3.0))
t = bpy.context.active_object
t.data.body = "SAY YES"
t.data.align_x = "CENTER"
t.data.size = 0.55
t.data.extrude = 0.03
t.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.convert(target="MESH")
t = bpy.context.active_object
t.name = "sign"
add(t, mat("sign", PORCELAIN, 0.3))

# ---------- освещение (для запекания) ----------
def area(name, loc, rot, size, energy, color=(1, 0.95, 0.88)):
    l = bpy.data.lights.new(name, "AREA")
    l.energy, l.size, l.color = energy, size, color
    o = bpy.data.objects.new(name, l)
    bpy.context.collection.objects.link(o)
    o.location, o.rotation_euler = loc, rot
    return o


area("fill_front", (0, -D / 2 - 1.5, 2.4), (math.radians(80), 0, 0), 7.0, 260)
area("ceil_soft", (0, 0, H - 0.05), (math.pi, 0, 0), 5.0, 90, (1, 0.97, 0.92))
for i, (lx, ly) in enumerate([(-3.0, 1.2), (-2.2, 1.2), (-1.4, 1.2)]):
    pl = bpy.data.lights.new(f"pend{i}", "POINT")
    pl.energy, pl.color, pl.shadow_soft_size = 45, (1, 0.8, 0.6), 0.15
    po = bpy.data.objects.new(f"pend{i}", pl)
    bpy.context.collection.objects.link(po)
    po.location = (lx, ly, H - 1.45)

world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.9, 0.9, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22
scene.world = world

# ---------- склейка, UV, запекание ----------
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
room = bpy.context.active_object
room.name = "salon"
for p in list(bpy.context.scene.objects):
    pass

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

img = bpy.data.images.new("salon_light", ATLAS, ATLAS)
img.colorspace_settings.name = "sRGB"
for m in room.data.materials:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image = img
    nt.nodes.active = n

scene.render.engine = "CYCLES"
c = scene.cycles
c.device = "CPU"
c.samples = SAMPLES
c.use_denoising = True
c.max_bounces = 6
bk = scene.render.bake
bk.use_pass_direct = True
bk.use_pass_indirect = True
bk.use_pass_color = True
bk.use_pass_diffuse = True
bk.use_pass_glossy = False
bk.use_pass_emit = True
bk.margin = 6
bk.target = "IMAGE_TEXTURES"
scene.view_settings.view_transform = "Standard"

bpy.ops.object.bake(type="COMBINED")
img.filepath_raw = os.path.join(ROOT, "scripts", "3d", "salon_light.png")
img.file_format = "PNG"
img.save()

# единый материал с атласом
final = bpy.data.materials.new("salon_baked")
final.use_nodes = True
nt = final.node_tree
b = nt.nodes["Principled BSDF"]
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = img
nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
room.data.materials.clear()
room.data.materials.append(final)

# ---------- путь камеры ----------
# (позиция, цель) — Three.js плавно ведёт камеру по ним при прокрутке
path = [
    {"p": [0.0, -9.0, 2.2], "t": [0.0, 0.0, 1.4]},
    {"p": [0.6, -4.4, 1.7], "t": [-1.6, 1.8, 1.3]},
    {"p": [-1.6, -0.6, 1.5], "t": [-2.2, 3.0, 1.4]},
    {"p": [-2.2, -0.2, 1.45], "t": [-2.2, 3.5, 1.6]},
    {"p": [-1.0, -0.3, 1.6], "t": [3.8, 0.5, 1.3]},
    {"p": [1.2, -3.2, 1.9], "t": [3.6, 0.6, 1.2]},
    {"p": [0.0, -3.0, 2.0], "t": [0.0, 3.5, 2.0]},
]
json.dump({"path": path, "fov": 42}, open(os.path.join(OUT, "camera.json"), "w"))

# ---------- контрольный кадр ----------
cam_d = bpy.data.cameras.new("cam")
cam_d.angle = math.radians(60)
cam = bpy.data.objects.new("cam", cam_d)
bpy.context.collection.objects.link(cam)
scene.camera = cam
look = path[1]
cam.location = look["p"]
d = Vector(look["t"]) - Vector(look["p"])
cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1280, 720
c.samples = 24
tmp = room.data.materials[0]
scene.render.filepath = os.path.join(ROOT, "scripts", "3d", "preview.png")
# предпросмотр: эмиссия атласа, чтобы видеть запечённый свет как в браузере
em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(tex.outputs["Color"], em.inputs["Color"])
out = nt.nodes["Material Output"]
nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
bpy.ops.render.render(write_still=True)
nt.links.remove(out.inputs["Surface"].links[0])
nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])

# ---------- экспорт ----------
for o in list(bpy.data.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o)
room.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "salon.glb"),
    export_format="GLB",
    use_selection=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_image_format="JPEG",
    export_jpeg_quality=88,
    export_apply=True,
    export_yup=True,
)
print("DONE", os.path.getsize(os.path.join(OUT, "salon.glb")))
