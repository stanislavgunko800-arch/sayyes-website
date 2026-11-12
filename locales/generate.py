"""Generate complete static RU/KA/EN pages, translated data and accessible language links."""
from html.parser import HTMLParser
from pathlib import Path
import json,re,html
from catalog import ROOT,CATALOG,RU_OVERRIDES,clean
MISSING=set()
UNCHANGED={'SAY','YES','SAY YES','BEAUTY · COFFEE · BAR','Telegram','WhatsApp','Instagram','Coca-Cola / Sprite','Schweppes / Red Bull','Aperol Spritz','French 75','Negroni / Bellini','Heineken / Corona Extra','Mac & cheese','01 / SAY YES'}
def translate(text,lang):
 key=clean(text)
 if not key:return text
 if lang=='ru':return RU_OVERRIDES.get(key,text)
 if key in CATALOG:return CATALOG[key][lang]
 match=re.match(r'^(\d+ / )(.+)$',key)
 if match and match[2] in CATALOG:return match[1]+CATALOG[match[2]][lang]
 if re.search('[А-Яа-яЁё]',key):MISSING.add(key)
 return text

def data_translate(value,lang,key=None):
 if isinstance(value,list):return [data_translate(x,lang) for x in value]
 if isinstance(value,dict):return {k:data_translate(v,lang,k) for k,v in value.items()}
 if isinstance(value,str):
  if key in ['id','image','price','icon','accent']:return '/'+value if key=='image' and value.startswith('assets/') else value
  return translate(value,lang)
 return value

class Localize(HTMLParser):
 def __init__(self,lang):super().__init__(convert_charrefs=True);self.lang=lang;self.output=[];self.original=[]
 def handle_decl(self,s):self.output.append('<!'+s+'>')
 def handle_starttag(self,tag,attrs):
  # Guest reviews are quoted verbatim in their original language (lang="ru").
  if tag!='html' and ('lang','ru') in attrs:self.original.append(tag)
  values=[]
  for key,value in attrs:
   if value is None:values.append(key);continue
   if key in ['alt','aria-label','title'] or (tag=='meta' and key=='content' and any(k=='name' and v=='description' for k,v in attrs)):value=translate(value,self.lang)
   if tag=='html' and key=='lang':value=self.lang
   if key in ['src','href']:
    if value.startswith('assets/') or value.startswith('fonts/') or value in ['style.css','app.js']:value='/'+value
    if value=='content.js':value=f'/{self.lang}/content.js'
    if tag=='iframe' and 'google.com/maps' in value:value+='&hl='+self.lang
   values.append(key+'="'+html.escape(value,quote=True)+'"')
  self.output.append('<'+tag+(' '+' '.join(values) if values else '')+'>')
 def handle_endtag(self,t):
  self.output.append('</'+t+'>')
  if self.original and self.original[-1]==t:self.original.pop()
 def handle_data(self,text):self.output.append(html.escape(text if self.original else translate(text,self.lang),quote=False))
 def handle_comment(self,s):self.output.append('<!--'+s+'-->')

base=(ROOT/'dist/index.html').read_text()
client_text=(ROOT/'dist/content.js').read_text();client=json.loads(client_text.removeprefix('window.SAYYES_CONTENT=').strip().rstrip(';'))
UI_KEYS=['Открыть меню','Закрыть меню','Запустить бегущую строку','Приостановить бегущую строку','Предыдущее фото','Следующее фото','Консультация бесплатно.','Выбрать время','BEAUTY / SAY YES','Приостановить видео','Воспроизвести видео','Пауза','Смотреть видео']
SITE='https://say-yes-space.com'
INDEXABLE=False  # flip to True on launch day: removes noindex, opens robots.txt, publishes the sitemap
SEO={
 'ru':{'title':'Say Yes Beauty Space — салон красоты и кафе-бар в Тбилиси, Сабуртало','description':'Салон красоты и кафе-бар в Сабуртало: волосы, маникюр, брови и ресницы, макияж, мужской уход, услуги для детей, кофе, завтраки и коктейли. Мераб Костава 71, ежедневно 10:00–22:00. Онлайн-запись.','locale':'ru_RU','street':'ул. Мераба Костава, 71','city':'Тбилиси'},
 'en':{'title':'Say Yes Beauty Space — beauty salon & coffee bar in Tbilisi, Saburtalo','description':'Beauty salon and café-bar in Saburtalo: hair, nails, brows and lashes, makeup, men’s grooming, kids’ services, coffee, breakfast and cocktails. 71 Merab Kostava St, open daily 10:00–22:00. Book online.','locale':'en_US','street':'71 Merab Kostava Street','city':'Tbilisi'},
 'ka':{'title':'Say Yes Beauty Space — სილამაზის სალონი და კაფე-ბარი თბილისში, საბურთალო','description':'სილამაზის სალონი და კაფე-ბარი საბურთალოზე: თმა, მანიკიური, წარბები და წამწამები, მაკიაჟი, მამაკაცთა მოვლა, საბავშვო მომსახურება, ყავა, საუზმე და კოქტეილები. მერაბ კოსტავას 71, ყოველდღე 10:00–22:00. ონლაინ ჩაწერა.','locale':'ka_GE','street':'მერაბ კოსტავას ქუჩა, 71','city':'თბილისი'}}
for lang in ['ru','ka','en']:
 parser=Localize(lang);parser.feed(base);page=''.join(parser.output)
 labels={'ru':'Русский','ka':'ქართული','en':'English'}
 switch='<div class="language-switch" role="group" aria-label="'+translate('Выбрать язык',lang)+'">'+''.join(f'<a href="/{code}/" lang="{code}" hreflang="{code}" data-language="{code}" aria-label="{name}"'+(' aria-current="page"' if lang==code else '')+'>'+{'ru':'RU','ka':'ქართული','en':'EN'}[code]+'</a>' for code,name in labels.items())+'</div>'
 page=page.replace('<div class="header-actions">','<div class="header-actions">'+switch)
 # Direct locale addresses work without JavaScript; x-default uses the Russian entry.
 # ---- SEO: per-language title/description, canonical, absolute hreflang, Open Graph, JSON-LD ----
 seo=SEO[lang];url=f'{SITE}/{lang}/'
 page=re.sub(r'<title>.*?</title>','<title>'+html.escape(seo['title'])+'</title>',page,count=1)
 page=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="'+html.escape(seo['description'],quote=True)+'">',page,count=1)
 if INDEXABLE:page=page.replace('<meta name="robots" content="noindex, nofollow">','<meta name="robots" content="index, follow, max-image-preview:large">')
 alternates=''.join(f'<link rel="alternate" hreflang="{code}" href="{SITE}/{code}/">' for code in labels)+f'<link rel="alternate" hreflang="x-default" href="{SITE}/ru/">'
 og=f'<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Say Yes Beauty Space"><meta property="og:title" content="{html.escape(seo["title"],quote=True)}"><meta property="og:description" content="{html.escape(seo["description"],quote=True)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og/say-yes.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="{seo["locale"]}">'+''.join(f'<meta property="og:locale:alternate" content="{SEO[c]["locale"]}">' for c in labels if c!=lang)+f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{SITE}/og/say-yes.jpg">'
 ld={"@context":"https://schema.org","@type":["BeautySalon","CafeOrCoffeeShop"],"name":"Say Yes Beauty Space","alternateName":"Say Yes","url":url,"image":f"{SITE}/og/say-yes.jpg","description":seo['description'],"telephone":"+995593616989","inLanguage":lang,
  "address":{"@type":"PostalAddress","streetAddress":seo['street'],"addressLocality":seo['city'],"addressCountry":"GE"},
  "openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"10:00","closes":"22:00"}],
  "hasMenu":url+"#menu","hasMap":"https://www.google.com/maps/search/?api=1&query=Say%20Yes%20Beauty%20Space%2C%2071%20Merab%20Kostava%20Street%2C%20Tbilisi",
  "sameAs":["https://www.instagram.com/say_yes_beauty","https://t.me/say_yes_beauty"],"areaServed":seo['city']}
 jsonld='<script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('</','<\\/')+'</script>'
 page=page.replace('</head>',alternates+og+jsonld+'''<script>try{var p=location.pathname,l=localStorage.getItem('sayyes-language');if(p==='/'&&['ru','ka','en'].includes(l))location.replace('/'+l+'/'+location.search+location.hash);}catch(e){}</script></head>''')
 folder=ROOT/'dist'/lang;folder.mkdir(exist_ok=True);(folder/'index.html').write_text(page)
 ui={key:translate(key,lang) for key in UI_KEYS}
 (folder/'content.js').write_text('window.SAYYES_CONTENT='+json.dumps(data_translate(client,lang),ensure_ascii=False).replace('</','<\\/')+';\nwindow.SAYYES_UI='+json.dumps(ui,ensure_ascii=False)+';\n')
 if lang=='ru':(ROOT/'dist/index.html').write_text(page)
(ROOT/'dist/content.js').unlink(missing_ok=True)
if MISSING:raise RuntimeError('Untranslated text: '+repr(sorted(MISSING)))
# ---- robots.txt, _headers, sitemap.xml ----
if INDEXABLE:
 (ROOT/'dist/robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
 (ROOT/'dist/_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n')
 urls=''.join(f'<url><loc>{SITE}/{c}/</loc><changefreq>weekly</changefreq><priority>{"1.0" if c=="ru" else "0.8"}</priority>'+''.join(f'<xhtml:link rel="alternate" hreflang="{x}" href="{SITE}/{x}/"/>' for x in ['ru','en','ka'])+f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}/ru/"/></url>' for c in ['ru','en','ka'])
 (ROOT/'dist/sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+urls+'</urlset>\n')
else:
 (ROOT/'dist/robots.txt').write_text('User-agent: *\nDisallow: /\n')
 (ROOT/'dist/_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n')
 (ROOT/'dist/sitemap.xml').unlink(missing_ok=True)
print('Generated complete ru/ka/en pages, menus, services, gallery labels and dynamic UI')
