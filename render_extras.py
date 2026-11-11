from pathlib import Path
import json,html
ROOT=Path(__file__).parent
MAP_QUERY='Say%20Yes%20Beauty%20Space%2C%2071%20Merab%20Kostava%20Street%2C%20Tbilisi'
GOOGLE='https://www.google.com/maps/search/?api=1&query='+MAP_QUERY
DIRECTIONS='https://www.google.com/maps/dir/?api=1&destination='+MAP_QUERY

def enhance(page,esc,cta):
 old='<div class="hero-photo">';start=page.index(old)+len(old);end=page.index('<div class="photo-label">',start)
 video='''<video class="hero-image hero-film" id="hero-film" muted playsinline loop preload="none" poster="/video/film-poster.webp" data-desktop="/video/sayyes-film.mp4" data-mobile="/video/sayyes-film-mobile.mp4" aria-label="Моменты Say Yes: работа мастеров, волосы и макияж"></video><button class="video-toggle" aria-controls="hero-film" aria-label="Воспроизвести видео" aria-pressed="false"><span class="video-toggle-icon" aria-hidden="true">▷</span><span data-video-label>Смотреть видео</span></button>'''
 page=page[:start]+video+page[end:]
 film_cards=''.join(f'''<article class="film-card reveal"><div class="film-frame"><video class="service-film" controls playsinline preload="none" poster="/video/{key}-poster.webp" aria-label="{esc(title)}"><source src="/video/{key}.mp4" type="video/mp4"></video></div><div><span class="eyebrow">0{i+1} / SAY YES</span><h3>{esc(title)}</h3><p>{esc(text)}</p></div></article>''' for i,(key,title,text) in enumerate([
 ('craft','За красивым результатом','Внимание к деталям и работа нашей команды.'),('hair','В движении','Форма, текстура и лёгкость готовой укладки.'),('makeup','Смелость быть собой','Выразительный образ и творческий подход к макияжу.')]))
 film=f'''<section class="films-section section-pad" id="films"><div class="section-meta"><span>BEAUTY / В ДВИЖЕНИИ</span><span>НАСТОЯЩИЕ МОМЕНТЫ SAY YES</span></div><div class="section-heading reveal"><h2>Не только красиво.<br><em>По-настоящему.</em></h2><p>Посмотрите, как мы работаем, и найдите вдохновение для своего следующего визита.</p></div><div class="films-grid">{film_cards}</div><div class="film-booking">{cta('Выбрать своего мастера')}<span>Мастера и свободное время — в онлайн-записи.</span></div></section>'''
 page=page.replace('<section id="coffee"',film+'\n<section id="coffee"')
 reviews=json.loads((ROOT/'reviews.json').read_text())['items']
 cards=''.join(f'''<article class="review-card reveal tone-{i%3}"{' data-has-photo' if v.get('photo') else ''}>'''+(f'''<img class="review-photo" src="{esc(v['photo'])}" alt="{esc(v.get('photoAlt',''))}" loading="lazy" decoding="async">''' if v.get('photo') else '')+f'''<div class="review-top"><span class="review-mark" aria-hidden="true">“</span><span>Яндекс · {v['date']}</span></div><p>{esc(v['summary'])}</p><div class="review-bottom"><b>{esc(v['author'])}</b><a href="{esc(v['url'])}" target="_blank" rel="noopener noreferrer">Читать оригинал ↗</a></div></article>''' for i,v in enumerate(reviews))
 review_section=f'''<section id="reviews" class="reviews-section section-pad"><div class="section-meta"><span>ГОСТИ О SAY YES</span><span>СЛОВА, КОТОРЫЕ ГРЕЮТ</span></div><div class="section-heading reveal"><h2>Возвращаются<br><em>за ощущением.</em></h2><p>Коротко о том, что отмечают наши гости. Это пересказ реальных отзывов; полный текст — по ссылке на источник.</p></div><div class="reviews-grid">{cards}</div><div class="reviews-actions">{cta('Открыть Google Maps',GOOGLE,'button button-outline')}{cta('Оставить отзыв',GOOGLE,'text-link')}</div></section>'''
 page=page.replace('<section id="contacts"',review_section+'\n<section id="contacts"')
 stats_html='''<div class="stats reveal" role="list"><div class="stat" role="listitem"><b data-count="14" data-suffix="+">14+</b><span>лет в beauty-индустрии</span></div><div class="stat" role="listitem"><b data-count="3">3</b><span>пространства за нашу историю</span></div><div class="stat" role="listitem"><b data-count="6">6</b><span>направлений beauty-услуг</span></div><div class="stat" role="listitem"><b data-count="32">32</b><span>позиции в меню кафе-бара</span></div></div>'''
 page=page.replace('<div class="founder"',stats_html+'<div class="founder"',1)

 page=page.replace('<div class="contact-links">','<p class="opening-hours">Ежедневно · 10:00–22:00</p><div class="route-buttons">'+cta('Построить маршрут',DIRECTIONS)+cta('Открыть Google Maps',GOOGLE,'text-link')+'</div><div class="contact-links">')
 map_section='''<section class="map-section" aria-label="Say Yes на карте Google"><iframe src="https://www.google.com/maps?q=71%20Merab%20Kostava%20Street%2C%20Tbilisi&z=17&output=embed" title="Карта: Тбилиси, Мераб Костава, 71" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><div class="map-caption"><b>Say Yes Beauty Space</b><span>Тбилиси, Мераб Костава, 71</span></div></section>'''
 page=page.replace('</main>',map_section+'</main>')
 page=page.replace('href="#contacts">Контакты</a>','href="#reviews">Отзывы</a><a href="#contacts">Контакты</a>')
 sticky='<a class="mobile-booking" href="https://dikidi.ru/887914" target="_blank" rel="noopener noreferrer"><i class="cta-icon cta-pulse" aria-hidden="true"></i><span>Выбрать время</span><span aria-hidden="true">↗</span></a>'
 page=page.replace('<dialog id="detail-dialog"',sticky+'<dialog id="detail-dialog"')
 return page
