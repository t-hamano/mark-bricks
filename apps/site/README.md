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

Set GitHub Pages to deploy from the `gh-pages` branch (root). Relevant pushes to `main` publish the site and Storybook to that branch through `.github/workflows/deploy-site.yml`. Pull requests only validate the build.

Pull requests that change the editor or Storybook also get a Storybook preview at `/pr-preview/pr-<number>/` through `.github/workflows/storybook-preview.yml`. It is linked from a PR comment and removed when the PR closes. PRs from forks and Dependabot get no preview.

Desktop download links come from the root `README.md`.

## Font license

The site uses [Newsreader](https://github.com/productiontype/Newsreader), licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/open-font-license-official-text/).

Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader)
