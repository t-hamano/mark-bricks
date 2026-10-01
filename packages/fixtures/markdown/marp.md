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

![bg left:42%](./image.jpg)

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

![bg right:40%](./image.jpg)

## Images that tell the story

* `bg` places a photo behind the slide
* `right:40%` splits the slide in two
* Text keeps the remaining space

---

![bg left:45% vertical](./image.jpg)
![bg sepia](./image.jpg)

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
