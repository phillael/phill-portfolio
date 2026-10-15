# Converts a Mixamo FBX (FBX Binary, "With Skin": actors.mjs reads the bind pose from the skin)
# into a GLB with just the skeleton, the skinned mesh and its clip, named <clip name>.
# actors.mjs then retargets it onto Phill (a file's only clip is named after the file):
#   /opt/homebrew/bin/blender --background --python fbx2glb.py -- ~/Downloads/Jumping.fbx <scratch>/jumping.glb jumping
# Never commit the FBX or the GLB it makes (the source is ~53 MB; only phill.glb ships).
import bpy, sys
src, out, name = sys.argv[sys.argv.index("--") + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
acts = list(bpy.data.actions)
print("[fbx2glb] actions:", [(a.name, tuple(a.frame_range)) for a in acts])
for a in acts: a.name = name
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_image_format="NONE", export_materials="NONE", export_force_sampling=True, export_frame_step=1)
