---
marp: true
theme: gaia
paginate: true
header: 'Mark Bricks'
footer: 'Markdown Slides for Engineering Teams'
style: |
  section {
    font-size: 34px;
    --color-background: #f8fafc;
    --color-foreground: #1e293b;
    --color-highlight: #0e7490;
    --color-dimmed: #64748b;
  }
  h2 { color: var(--color-highlight); }
  strong { color: var(--color-highlight); }
  section.lead h1 { font-size: 64px; }
---

<!--
_class: lead
_paginate: false
_header: ''
_footer: ''
-->

![bg left:42%](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAMAAADSOgUjAAAABlBMVEXZ3eO0u8ULkbaWAAAB8UlEQVR42u3YAWoCQQyGUXP/SxeKlJaqqP9idjLvu8CS5+Jm5nKRJEmSJEmSJEmSJEmSJEmSJEmSJEmaU10jkegxPIAPYcyHMPcjmPoRTP0IAmz2I5j6EQQIcG0/ggABAgSo9/0IegMBAgQogM7CAAHqdUE+mSAdgK2CbDJBMpkgl4iQSUTIIzEkIUmSJEmSJEnSS7lcT/0Ipn4EQz6EuR/B1I9g6kcw9SOY+hEM+QjGfghjP4KpH8HUj2DqRzD1IxjyIcz9CKZ+BFM/gqnfUYJzfoqqBsFBb3NVg+CcP4R6swOfuqVfNvacz1JVg+CgL3tVg+Cg7aiqQXDQglnVIDhnR68j2vjGrA7q+Ifu5ffSvIMO21UNgoPuK6o+L9hyYbGE33PDttxYLOL3zKwN5+11+J6YtefKYiG/x6O2nLgX83s0acuJcTm/+3M2HHiW9Ls3ZsOBZ1G/m1O2nHgW5bs1ZMPCvrLfvyE7Nva1/f7O+Pl9c32/XyM2LJwT/H4m7Ng4R/hdB2xYmKb4fc/XsDGN4Wv4WvE7MWGNjt/ZCWuD+J2XsLYJ3wkJa7f4nYqw9ozfSQhr5/B1E5YiQ3gZIbmMEFtGyCwjBBYRwsoISWWEmDJCRhkhoIyQTkRIJiPEkhkiyQh5ZIQwMkISGSGGiPALq7g20jtaxKcAAAAASUVORK5CYII=)

# Markdown Slides for Engineering Teams

Write, review and present decks like code with MarkBricks and Marp

The MarkBricks team · October 2026

---

## Why slides in Markdown?

* **Plain text**: diff, review and merge slides like code
* **Content first**: the theme takes care of layout and type
* **Portable**: export HTML, PDF or PowerPoint from one file
* **Fast to edit**: fix a typo without hunting through panels
* **Future-proof**: any text editor opens it, years from now

<!--
Ask the audience how many of them fought with text box alignment this week.
-->

---

<!--
_class: lead
_paginate: false
_header: ''
_backgroundColor: '#0e7490'
_color: '#f8fafc'
-->

# How a deck is built

---

## One file, every slide

```markdown
---
marp: true
theme: gaia
---

# Title slide

---

## Next slide
```

Front matter sets the theme, and each divider starts a new slide.

---

<style scoped>
table { font-size: 26px; }
</style>

## Slide apps vs. Markdown

| Task            | Slide app                | Markdown                         |
| --------------- | ------------------------ | -------------------------------- |
| Version control | Binary `.pptx` files     | **Readable diffs** in Git        |
| Review          | Comments on a PDF export | Line comments in a pull request  |
| Layout          | Nudged by hand           | Driven by the **theme**          |
| Branding        | Copied between templates | One shared `style` in CSS        |
| Code samples    | Pasted screenshots       | Fenced code with *highlighting*  |
| Export          | *Save As* per format     | HTML, PDF and PPTX from one file |

---

![bg right:40%](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAMAAADSOgUjAAAABlBMVEXZ3eO0u8ULkbaWAAAB8UlEQVR42u3YAWoCQQyGUXP/SxeKlJaqqP9idjLvu8CS5+Jm5nKRJEmSJEmSJEmSJEmSJEmSJEmSJEmaU10jkegxPIAPYcyHMPcjmPoRTP0IAmz2I5j6EQQIcG0/ggABAgSo9/0IegMBAgQogM7CAAHqdUE+mSAdgK2CbDJBMpkgl4iQSUTIIzEkIUmSJEmSJEnSS7lcT/0Ipn4EQz6EuR/B1I9g6kcw9SOY+hEM+QjGfghjP4KpH8HUj2DqRzD1IxjyIcz9CKZ+BFM/gqnfUYJzfoqqBsFBb3NVg+CcP4R6swOfuqVfNvacz1JVg+CgL3tVg+Cg7aiqQXDQglnVIDhnR68j2vjGrA7q+Ifu5ffSvIMO21UNgoPuK6o+L9hyYbGE33PDttxYLOL3zKwN5+11+J6YtefKYiG/x6O2nLgX83s0acuJcTm/+3M2HHiW9Ls3ZsOBZ1G/m1O2nHgW5bs1ZMPCvrLfvyE7Nva1/f7O+Pl9c32/XyM2LJwT/H4m7Ng4R/hdB2xYmKb4fc/XsDGN4Wv4WvE7MWGNjt/ZCWuD+J2XsLYJ3wkJa7f4nYqw9ozfSQhr5/B1E5YiQ3gZIbmMEFtGyCwjBBYRwsoISWWEmDJCRhkhoIyQTkRIJiPEkhkiyQh5ZIQwMkISGSGGiPALq7g20jtaxKcAAAAASUVORK5CYII=)

## Images that tell the story

* `bg` places a photo behind the slide
* `right:40%` splits the slide in two
* Text keeps the remaining space

---

![bg left:45% vertical](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAMAAADSOgUjAAAABlBMVEXZ3eO0u8ULkbaWAAAB8UlEQVR42u3YAWoCQQyGUXP/SxeKlJaqqP9idjLvu8CS5+Jm5nKRJEmSJEmSJEmSJEmSJEmSJEmSJEmaU10jkegxPIAPYcyHMPcjmPoRTP0IAmz2I5j6EQQIcG0/ggABAgSo9/0IegMBAgQogM7CAAHqdUE+mSAdgK2CbDJBMpkgl4iQSUTIIzEkIUmSJEmSJEnSS7lcT/0Ipn4EQz6EuR/B1I9g6kcw9SOY+hEM+QjGfghjP4KpH8HUj2DqRzD1IxjyIcz9CKZ+BFM/gqnfUYJzfoqqBsFBb3NVg+CcP4R6swOfuqVfNvacz1JVg+CgL3tVg+Cg7aiqQXDQglnVIDhnR68j2vjGrA7q+Ifu5ffSvIMO21UNgoPuK6o+L9hyYbGE33PDttxYLOL3zKwN5+11+J6YtefKYiG/x6O2nLgX83s0acuJcTm/+3M2HHiW9Ls3ZsOBZ1G/m1O2nHgW5bs1ZMPCvrLfvyE7Nva1/f7O+Pl9c32/XyM2LJwT/H4m7Ng4R/hdB2xYmKb4fc/XsDGN4Wv4WvE7MWGNjt/ZCWuD+J2XsLYJ3wkJa7f4nYqw9ozfSQhr5/B1E5YiQ3gZIbmMEFtGyCwjBBYRwsoISWWEmDJCRhkhoIyQTkRIJiPEkhkiyQh5ZIQwMkISGSGGiPALq7g20jtaxKcAAAAASUVORK5CYII=)

![bg sepia](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAMAAADSOgUjAAAABlBMVEXZ3eO0u8ULkbaWAAAB8UlEQVR42u3YAWoCQQyGUXP/SxeKlJaqqP9idjLvu8CS5+Jm5nKRJEmSJEmSJEmSJEmSJEmSJEmSJEmaU10jkegxPIAPYcyHMPcjmPoRTP0IAmz2I5j6EQQIcG0/ggABAgSo9/0IegMBAgQogM7CAAHqdUE+mSAdgK2CbDJBMpkgl4iQSUTIIzEkIUmSJEmSJEnSS7lcT/0Ipn4EQz6EuR/B1I9g6kcw9SOY+hEM+QjGfghjP4KpH8HUj2DqRzD1IxjyIcz9CKZ+BFM/gqnfUYJzfoqqBsFBb3NVg+CcP4R6swOfuqVfNvacz1JVg+CgL3tVg+Cg7aiqQXDQglnVIDhnR68j2vjGrA7q+Ifu5ffSvIMO21UNgoPuK6o+L9hyYbGE33PDttxYLOL3zKwN5+11+J6YtefKYiG/x6O2nLgX83s0acuJcTm/+3M2HHiW9Ls3ZsOBZ1G/m1O2nHgW5bs1ZMPCvrLfvyE7Nva1/f7O+Pl9c32/XyM2LJwT/H4m7Ng4R/hdB2xYmKb4fc/XsDGN4Wv4WvE7MWGNjt/ZCWuD+J2XsLYJ3wkJa7f4nYqw9ozfSQhr5/B1E5YiQ3gZIbmMEFtGyCwjBBYRwsoISWWEmDJCRhkhoIyQTkRIJiPEkhkiyQh5ZIQwMkISGSGGiPALq7g20jtaxKcAAAAASUVORK5CYII=)

## Filters set the mood

* Stack several `bg` images
* `sepia` restyles a photo
* No image editor needed

<!--
Point at the lower photo: the same file, with only a sepia filter applied.
-->

---

<style scoped>
p { color: var(--color-dimmed); }
</style>

## Planning the talk length

$$
T = \sum_{i=1}^{n} t_i \approx 1.5\,\text{min} \times n
$$

Ten slides fill about fifteen minutes, before questions.

---

## Writing with MarkBricks

1) Draft the outline as headings and lists
2) Split slides with a divider block
3) Open **Preview Slides** to rehearse

***

<!--
_class: lead
_paginate: false
_header: ''
_footer: ''
-->

# Thank you

Questions are welcome.
[github.com/t-hamano/mark-bricks](https://github.com/t-hamano/mark-bricks)
