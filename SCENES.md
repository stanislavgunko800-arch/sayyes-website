# Scenes: where the generated pictures go

Eight slots. Each shows today's photo until a real picture is put in.

| slot | where on the page | idea for the picture | big caption |
|---|---|---|---|
| `hero` | first screen (replaces the video) | woman walking, carrying a giant hair dryer or coffee cup | — |
| `services` | before «О пространстве» | POV from inside a burgundy basket full of beauty tools, face looking in | Всё для вас |
| `coffee` | before «Coffee & bar» | vending machine with cups and desserts | Take yours. |
| `menu` | before the menu | woman hiding her face behind a newspaper-menu | Что сегодня в меню? |
| `atmosphere` | before the gallery | stack of old monitors, each with a salon moment | Ваш новый ритуал |
| `team` | before «История» | long printer strip of portraits | Лица Say Yes |
| `market` | before «Market» | giant cream tube carried by a model | Take it home. |
| `reviews` | before the reviews | the picture sits on a wall of repeated «SAY YES.» | (wall of words) |

Pictures are 4:5 (portrait). Hero: 4:5 or 3:4.
An optional transparent PNG **cut-out** (`<slot>-cut.png`) overlaps the frame edge.

## Put a picture in (one command)

```bash
python3 scripts/set_scene.py services ~/Downloads/basket.png          # framed picture
python3 scripts/set_scene.py services ~/Downloads/woman.png --cut     # transparent cut-out
python3 scripts/set_scene.py services --reset                         # back to the default photo
```

It resizes the file into `public/scenes/`, rebuilds the site. Then commit and push as usual.
Or drop `public/scenes/<slot>.jpg` (or `.webp`/`.png`) by hand and run `npm run build`.
