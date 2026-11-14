/**
 * `data:` URI of a neutral picture of a landscape, for patterns to show where
 * an image goes.
 *
 * It is embedded in the Markdown, so it shows offline and in every host, and
 * depends on no external URL or license. Keep it small: every inserted
 * pattern writes it into the user's document.
 *
 * It is a PNG, because Marp, like markdown-it, only loads `data:` images in
 * the GIF, PNG, JPEG and WebP formats, and writes any other image, such as an
 * SVG, as text.
 */
export const PLACEHOLDER_IMAGE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAMAAADSOgUjAAAABlBMVEXZ3eO0u8ULkbaWAAAB8UlEQVR42u3YAWoCQQyGUXP/SxeKlJaqqP9idjLvu8CS5+Jm5nKRJEmSJEmSJEmSJEmSJEmSJEmSJEmaU10jkegxPIAPYcyHMPcjmPoRTP0IAmz2I5j6EQQIcG0/ggABAgSo9/0IegMBAgQogM7CAAHqdUE+mSAdgK2CbDJBMpkgl4iQSUTIIzEkIUmSJEmSJEnSS7lcT/0Ipn4EQz6EuR/B1I9g6kcw9SOY+hEM+QjGfghjP4KpH8HUj2DqRzD1IxjyIcz9CKZ+BFM/gqnfUYJzfoqqBsFBb3NVg+CcP4R6swOfuqVfNvacz1JVg+CgL3tVg+Cg7aiqQXDQglnVIDhnR68j2vjGrA7q+Ifu5ffSvIMO21UNgoPuK6o+L9hyYbGE33PDttxYLOL3zKwN5+11+J6YtefKYiG/x6O2nLgX83s0acuJcTm/+3M2HHiW9Ls3ZsOBZ1G/m1O2nHgW5bs1ZMPCvrLfvyE7Nva1/f7O+Pl9c32/XyM2LJwT/H4m7Ng4R/hdB2xYmKb4fc/XsDGN4Wv4WvE7MWGNjt/ZCWuD+J2XsLYJ3wkJa7f4nYqw9ozfSQhr5/B1E5YiQ3gZIbmMEFtGyCwjBBYRwsoISWWEmDJCRhkhoIyQTkRIJiPEkhkiyQh5ZIQwMkISGSGGiPALq7g20jtaxKcAAAAASUVORK5CYII=';

/**
 * `data:` URI of the same picture in portrait, for patterns that show a whole
 * image within the slide, so the space around it shows.
 */
export const PLACEHOLDER_IMAGE_PORTRAIT =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAADwAQMAAACTytwLAAAABlBMVEXZ3eO0u8ULkbaWAAACDElEQVR42u2XQU5DIRCGf0ZM2JWFe4kn4WZyFI/iUXqEalw8k1pcMPQ9hkFrdKGGSdqmX6cw/2MYBmDatGn/xm4POs8nAAAJfAWTNPddznvN3wNe4wFwGo+ABQAjwwEy9f6mugpOAJCU8RuH1SzPfam/Yw2X+o+4r2/fHOe38UN9++Y4CwDsL/c/AsDjB/4ir8yJGXXphqzFmYCTxh95bsn3rEHyAz8jyV+Ah6/sR4TnWcOmTftj5gZ17GbA7wY8DrgZzJuT6m/kQFQ/gsrtoA67cqJ13EvB1Jy8HQ/qgd7LrTqzVEznX5PCqRuKzsGEL5xTrh7hgvtuhal2PUIwQe88zHoMUedv+hWm5ogSnPpnR+uzDx13A71+7VkaHvqUpnVGO4iTOr25iCbhb5SU3vaCSXCr7A3aBBgE95/0FV7woOzhbUZZoSvXvdeKN4O8Iq1Xoe2wSS5tI/iauds22wAc98NSrufsC0Jw4P42iqIVeYB8tmP5vgCgbdScrFbdR8RrSCIJLPdjtu264IAEUPPUYwk2AtTICuUVlAKGyPru1/jzochZZJyuxGQBc15FAHizuDoCmUAyK23RQaQV/ASyIut9iYmcaDMDl0Evgo+8QLd5a/uyGgsoaPXRgtpy52sdNLnhr7ul/E3ejzi8JMsyhxeV+x0ABHlf4zC8mLfa0z+7B00++eQ/yN8B/DpxlDyv+SsAAAAASUVORK5CYII=';
