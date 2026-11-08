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
