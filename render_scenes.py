# -*- coding: utf-8 -*-
"""Eight editorial "scene" slots (hero + seven bands between sections).

A slot shows today's photo until a real picture is dropped in public/scenes/:
  <slot>.jpg|webp|png   the framed picture
  <slot>-cut.png        optional transparent cut-out that overlaps the frame
See SCENES.md and scripts/set_scene.py.
"""
from pathlib import Path
import html
ROOT=Path(__file__).parent
DIR=ROOT/'public'/'scenes'
EXTS=('jpg','jpeg','webp','png')

def _find(name):
    for e in EXTS:
        p=DIR/f'{name}.{e}'
        if p.exists():return f'/scenes/{p.name}?v={int(p.stat().st_mtime)}'
    return None

# slot -> (insert before, placeholder key, chip, title, tone)
SCENES=[
 ('services','<section id="about"','services','BEAUTY','Всё для вас'),
 ('coffee','<section id="coffee"','coffee','COFFEE & BAR','Take yours.'),
 ('menu','<section id="menu"','menu','THE MENU','Что сегодня в меню?'),
 ('atmosphere','<section id="gallery"','atmosphere','THE SPACE','Ваш новый ритуал'),
 ('team','<section id="story"','team','THE TEAM','Лица Say Yes'),
 ('market','<section id="market"','market','MARKET','Take it home.'),
 ('reviews','<section id="reviews"','reviews','REVIEWS','SAY YES.'),
]

def placeholders(d):
    g=d['moodGallery']
    return {
     'services':d['services'][0]['image'],
     'coffee':d['menuIntro']['images'][0],
     'menu':d['menuIntro']['images'][1],
     'atmosphere':g[1]['image'],
     'team':d['founder']['image'],
     'market':d['products'][0]['image'],
     'reviews':g[0]['image'],
    }

def hero_scene():
    src=_find('hero')
    return f'<img class="hero-scene" src="{src}" alt="" width="1200" height="1500" decoding="async" fetchpriority="high">' if src else ''

def build(d,mapping,page,esc):
    ph=placeholders(d)
    for i,(slot,before,key,chip,title) in enumerate(SCENES):
        src=_find(slot) or mapping[ph[key]]
        cut=_find(slot+'-cut')
        cut_html=f'<img class="scene-cut" src="{cut}" alt="" loading="lazy" decoding="async">' if cut else ''
        wall=''
        head=f'<h2 class="scene-title"><span>{esc(title)}</span></h2>'
        if slot=='reviews':
            wall='<div class="scene-wall" aria-hidden="true">'+''.join('<span>SAY YES.</span>' for _ in range(5))+'</div>'
            head='<h2 class="scene-title scene-title-hidden">SAY YES.</h2>'
        block=(f'<section class="scene scene-{slot} {"is-flip" if i%2 else ""} reveal" data-scene="{slot}">{wall}'
               f'<div class="scene-inner">{head}'
               f'<figure class="scene-frame"><span class="scene-chip">{esc(chip)}</span>'
               f'<div class="scene-photo"><img src="{src}" alt="" loading="lazy" decoding="async"></div>{cut_html}</figure></div></section>\n')
        assert before in page,before
        page=page.replace(before,block+before,1)
    return page
