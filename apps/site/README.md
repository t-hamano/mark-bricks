# MarkBricks website

- Website: <https://t-hamano.github.io/mark-bricks/>
- Storybook: <https://t-hamano.github.io/mark-bricks/storybook/>

## Development

Run from the repository root:

```sh
pnpm dev:site
```

Build and preview the site with Storybook:

```sh
pnpm build:pages
pnpm preview:site
```

The site is at `/`, and Storybook is at `/storybook/`. Use `pnpm build:site` for a site-only build.

## Publishing

Set GitHub Pages to use **GitHub Actions**. Relevant pushes to `main` deploy the site and Storybook through `.github/workflows/deploy-site.yml`. Pull requests only validate the build.

Desktop download links come from the root `README.md`.
