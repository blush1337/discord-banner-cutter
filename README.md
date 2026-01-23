```
██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗ 
██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║
██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║
██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝
╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 
        [ BANNER CUTTER v1.2 ]
```

## ┌─[ DESCRIPTION ]

Web-приложение для создания баннера и аватарки для Discord профиля с поддержкой анимированных GIF.

## ┌─[ CHANGELOG ]

### v1.2
```
├─ Добавлена поддержка GIF (анимированные баннеры и аватарки)
└─ Добавлено логирование операций
```

```
├─ interactive_editor: [DRAG] + [SCROLL]
├─ real_time_preview: enabled
├─ gif_support: animated_preview
├─ output_format: banner(400x140) + avatar(80x80)
├─ design: terminal_dark_theme
└─ installation: not_required
```

## ┌─[ USAGE ]

```
[1] Open index.html in browser
[2] Click [ LOAD_BANNER ] and select image (PNG, JPG, or GIF)
[3] Drag image with mouse to position
[4] Use mouse wheel to zoom
[5] GIF files will animate automatically in preview
[6] Save results:
    ├─ [ SAVE_BANNER ] → discord_banner.gif/png (400x140)
    ├─ [ SAVE_AVATAR ] → discord_avatar.gif/png (80x80, circular)
    └─ [ SAVE_ALL ] → both files (animated if GIF source)
```

## ┌─[ GIF_SUPPORT ]

```
├─ Animated GIF preview in editor
├─ Real-time animation playback
├─ Frame-by-frame rendering
├─ Export animated banner (400x140 GIF)
└─ Export animated avatar (80x80 circular GIF)
```

## ┌─[ DISCORD_PARAMETERS ]

```
banner_size:        400x140 pixels
avatar_crop_area:   120x120 pixels
avatar_output_size: 80x80 pixels
avatar_position:    X=30, Y=80
```

## ┌─[ CONTROLS ]

```
[DRAG]   → Left mouse button + move
[ZOOM]   → Mouse wheel up/down
```

## ┌─[ TECH_STACK ]

```
├─ HTML5 Canvas
├─ Vanilla JavaScript
├─ CSS3
├─ gifler.js (GIF parsing)
└─ gif.js (GIF encoding)
```