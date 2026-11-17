#!/usr/bin/env python3
"""Put a picture into one of the website's scene slots, then rebuild.

  python3 scripts/set_scene.py services ~/Downloads/basket.png
  python3 scripts/set_scene.py services ~/Downloads/woman-cutout.png --cut
  python3 scripts/set_scene.py services --reset        # back to the default photo

Slots: hero services coffee menu atmosphere team market reviews
"""
import subprocess,sys,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
DIR=ROOT/'public'/'scenes'
SLOTS=['hero','services','coffee','menu','atmosphere','team','market','reviews']
args=[a for a in sys.argv[1:] if not a.startswith('--')]
cut='--cut' in sys.argv;reset='--reset' in sys.argv
if not args or args[0] not in SLOTS or (not reset and len(args)<2):
    sys.exit(__doc__)
slot=args[0];DIR.mkdir(parents=True,exist_ok=True)
def clear(name):
    for e in ('jpg','jpeg','webp','png'):
        (DIR/f'{name}.{e}').unlink(missing_ok=True)
if reset:
    clear(slot);clear(slot+'-cut')
else:
    src=Path(args[1]).expanduser()
    if not src.exists():sys.exit(f'not found: {src}')
    if cut:
        clear(slot+'-cut');out=DIR/f'{slot}-cut.png'
        subprocess.run(['sips','-Z','1400','-s','format','png',str(src),'--out',str(out)],check=True,capture_output=True)
    else:
        clear(slot);out=DIR/f'{slot}.jpg'
        subprocess.run(['sips','-Z','1800','-s','format','jpeg','-s','formatOptions','82',str(src),'--out',str(out)],check=True,capture_output=True)
    print('saved',out.relative_to(ROOT),out.stat().st_size//1024,'KB')
subprocess.run(['npm','run','build'],cwd=ROOT,check=True)
