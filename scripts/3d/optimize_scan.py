# -*- coding: utf-8 -*-
"""Облегчение скана (Luma/Polycam GLB) для сайта.
Запуск: blender -b -P scripts/3d/optimize_scan.py -- in.glb out.glb [faces=90000] [tex=2048]
Что делает: сворачивает полигоны (Decimate collapse, UV сохраняются),
уменьшает текстуры, экспортирует GLB со сжатием Draco и JPEG-текстурами."""
import bpy, sys
a = sys.argv[sys.argv.index("--") + 1:]
src, dst = a[0], a[1]
target = int(a[2]) if len(a) > 2 else 90000
tex = int(a[3]) if len(a) > 3 else 2048
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
total = sum(len(o.data.polygons) for o in meshes)
ratio = min(1.0, target / total)
for o in meshes:
    bpy.context.view_layer.objects.active = o
    m = o.modifiers.new("dec", "DECIMATE")
    m.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=m.name)
for i in bpy.data.images:
    w, h = i.size
    if max(w, h) > tex:
        k = tex / max(w, h)
        i.scale(max(1, int(w * k)), max(1, int(h * k)))
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=True,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
    export_image_format="JPEG", export_jpeg_quality=82, export_yup=True)
print("FACES", total, "->", sum(len(o.data.polygons) for o in meshes))
