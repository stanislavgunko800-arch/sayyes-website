#!/usr/bin/env python3
"""Snapshot the public price list from the salon CRM into services-crm.json.

Usage: python3 scripts/sync_services.py [path/to/salon.json]
Reads the CRM data file only; nothing in the CRM is modified.
Then run `npm run build` to rebuild the site.
"""
import json,sys
from pathlib import Path
SRC=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'code/sayyes-crm/data/salon.json'
OUT=Path(__file__).resolve().parent.parent/'services-crm.json'
# website card -> CRM categories (in display order)
GROUPS=[
 ('Волосы',['Женские стрижки','Окрашивание волос','Долговременная завивка волос','Укладка волос','Уход за волосами и кожей головы']),
 ('Ногтевой сервис',['Женский маникюр','Женский педикюр']),
 ('Брови и ресницы',['Брови','Ресницы']),
 ('Мужской уход',['Мужские сервисы']),
 ('Макияж',['Макияж']),
 ('Дети',['Дети']),
]
# the short list shown in the hover popover
MAIN={
 'Стрижка женская','Тонирование всей длины','Окрашивание корней + окрашивание длины','Растяжка цвета: Балаяж','Аиртач: премиальная техника осветления','Укладка на горячий инструмент',
 'Комплекс: базовый маникюр','Комплекс: наращивание ногтей','Комплекс: натуральный маникюр','Японский маникюр','Комплекс: базовый педикюр','Японский педикюр',
 'Ламинирование бровей','Окрашивание бровей','Женская коррекция бровей (воск + пинцет + уход)','Ламинирование бровей и ресниц (полный комплекс)','Окрашивание ресниц + уход','Комплекс: ламинирование + окрашивание + коррекция',
 'Мужская стрижка','Комплекс: Стрижка + Борода','Борода','Камуфляж головы American Crew','Комплекс: натуральный мужской маникюр','Комплекс: мужской натуральный педикюр',
 'Нюдовый макияж','Вечерний или фото макияж','Свадебный макияж','Креативный макияж','Акцент в макияже','Комплекс в 4 руки: полный образ (макияж + укладка)',
 'Стрижка детская (мальчик 4–8 лет)','Стрижка детская (девочка 4–8 лет)','Окрашивание прядей цветным баллончиком',
}
data=json.loads(SRC.read_text())
by_cat={}
for s in data['services']:
    if s.get('active',True):by_cat.setdefault(s['category'],[]).append(s)
out=[]
for title,cats in GROUPS:
    groups=[]
    for c in cats:
        items=[{'name':s['name'],'price':s['price'],'minutes':s['duration'],'main':s['name'] in MAIN} for s in by_cat.get(c,[])]
        if items:groups.append({'category':c,'items':items})
    out.append({'title':title,'groups':groups})
OUT.write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
print('wrote',OUT,sum(len(g['items']) for o in out for g in o['groups']),'services')
