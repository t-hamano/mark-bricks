# [0.5.0](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.4.0...vscode-v0.5.0) (2026-11-08)

### Bug Fixes

- **editor:** apply external content that returns to an earlier version ([#235](https://github.com/t-hamano/mark-bricks/issues/235)) ([005b404](https://github.com/t-hamano/mark-bricks/commit/005b404404b89ae4dff532d9b59ffe8c2136fbb9))
- **editor:** keep inner blocks other than a nested list when editing list items ([#139](https://github.com/t-hamano/mark-bricks/issues/139)) ([261b1fe](https://github.com/t-hamano/mark-bricks/commit/261b1fea18d18f4ca497599a8587de904ebb8f20))
- **editor:** keep the header toolbar separators light regardless of stylesheet order ([bf402f2](https://github.com/t-hamano/mark-bricks/commit/bf402f2540512ecf06775951b9bb87082da035f9))
- **editor:** lighten the mobile block toolbar borders and scroll it when it overflows ([2f01865](https://github.com/t-hamano/mark-bricks/commit/2f018657bf3b5778f4c315c9a8229c381015de2b))
- **editor:** match mobile toolbar separator color to its border ([#233](https://github.com/t-hamano/mark-bricks/issues/233)) ([7142197](https://github.com/t-hamano/mark-bricks/commit/71421971d0a867386578aec76cea13c7cf7cdfa6))
- **editor:** move inner block templates to block type settings ([#228](https://github.com/t-hamano/mark-bricks/issues/228)) ([b75dfab](https://github.com/t-hamano/mark-bricks/commit/b75dfab25e8c1ed6e219d251b3183fe5d266af21))
- **editor:** scroll the header block toolbar instead of squeezing the header actions ([fea8a6e](https://github.com/t-hamano/mark-bricks/commit/fea8a6e249092dece40005efe338c0db39aca231))
- **editor:** stop the block mover from adding a scrollbar to the mobile block toolbar ([97d7a45](https://github.com/t-hamano/mark-bricks/commit/97d7a45b9f188337001493472afb102d9cbb37bc))
- **repo:** let the keyboard reach the current slide in the slide preview ([99f34c7](https://github.com/t-hamano/mark-bricks/commit/99f34c7c6eb8498f5c9fcf1a6648cb9318f72e79))
- **repo:** translate the slide names that screen readers announce ([ebcbf25](https://github.com/t-hamano/mark-bricks/commit/ebcbf254b592817e5ff9c91cdac4419824ccc631))
- **repo:** word the slide preview's controls the same in both apps ([#180](https://github.com/t-hamano/mark-bricks/issues/180)) ([beadc87](https://github.com/t-hamano/mark-bricks/commit/beadc8760127c0fe1e560cbc32ccce5c14a2db33))
- **vscode:** let copy, cut and paste work in the block canvas ([#179](https://github.com/t-hamano/mark-bricks/issues/179)) ([294c5b5](https://github.com/t-hamano/mark-bricks/commit/294c5b5d47a4e81017d09660a144d2da7eefc257))

### Features

- **editor:** explain marp image keywords in the image alt text field ([#165](https://github.com/t-hamano/mark-bricks/issues/165)) ([e58629f](https://github.com/t-hamano/mark-bricks/commit/e58629f8dc591f79bf5372b350499a2635e13f9a))
- **editor:** hide the empty text of a list item that opens with a block ([#231](https://github.com/t-hamano/mark-bricks/issues/231)) ([bad278b](https://github.com/t-hamano/mark-bricks/commit/bad278b42332acfb12f8efe3b3f3a1447a9bca39))
- **editor:** merge list item text with an inner paragraph on delete and backspace ([#232](https://github.com/t-hamano/mark-bricks/issues/232)) ([5bc8ea8](https://github.com/t-hamano/mark-bricks/commit/5bc8ea89a0078e42a8bc5f1c49d2537cbb975ea2))
- **editor:** share the marp check and show the marp mode badge in the editor header ([#167](https://github.com/t-hamano/mark-bricks/issues/167)) ([86d6529](https://github.com/t-hamano/mark-bricks/commit/86d6529b8ef1301321d8e050e0b69e6538e4b519))
- **repo:** add an export entry that renders marp decks into standalone html ([#182](https://github.com/t-hamano/mark-bricks/issues/182)) ([81956c5](https://github.com/t-hamano/mark-bricks/commit/81956c53f5ca575791ce6e008730c526cfbf9a4f))
- **repo:** add the preview's toolbar and slide mode to exported marp html ([#188](https://github.com/t-hamano/mark-bricks/issues/188)) ([4b07d2f](https://github.com/t-hamano/mark-bricks/commit/4b07d2f00fd959b5e9047bf438eac8b0c466a932))
- **vscode:** add a marp slide preview ([#169](https://github.com/t-hamano/mark-bricks/issues/169)) ([aff6128](https://github.com/t-hamano/mark-bricks/commit/aff612819ac444cfac4a4e3d5f338e337e9a4b20))
- **vscode:** add a slide mode to the slide preview ([#176](https://github.com/t-hamano/mark-bricks/issues/176)) ([4f89015](https://github.com/t-hamano/mark-bricks/commit/4f89015a0d2cbd70f6b7646d49df818c1f05fb51))
- **vscode:** add a title bar button that lists the extension's commands ([#181](https://github.com/t-hamano/mark-bricks/issues/181)) ([69ddd78](https://github.com/t-hamano/mark-bricks/commit/69ddd78fafe4c19857d58416a4ac9637d0ed081b))
- **vscode:** export marp slide decks to html and pdf ([#183](https://github.com/t-hamano/mark-bricks/issues/183)) ([7b6bece](https://github.com/t-hamano/mark-bricks/commit/7b6becec21c77040db63f19eff8445ffd5809bca))

# [0.4.0](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.3.0...vscode-v0.4.0) (2026-10-01)

### Bug Fixes

- **editor:** support attention serialization of mdast-util-to-markdown 2.1.3 ([#153](https://github.com/t-hamano/mark-bricks/issues/153)) ([54d3070](https://github.com/t-hamano/mark-bricks/commit/54d3070ab31eda25e205b6c001ca06d96f8b79e1))

### Features

- **editor:** add a math block that reads and writes $$ and ```math ([#144](https://github.com/t-hamano/mark-bricks/issues/144)) ([28e9101](https://github.com/t-hamano/mark-bricks/commit/28e91017ef436176af1168a66d9314e34f72b12d))
- **editor:** keep every block inside a list item ([#130](https://github.com/t-hamano/mark-bricks/issues/130)) ([889f162](https://github.com/t-hamano/mark-bricks/commit/889f162506442f5346b2f212d773bf2407073e6d))

# [0.3.0](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.2.0...vscode-v0.3.0) (2026-09-29)

### Bug Fixes

- **vscode:** display local images in the block canvas ([#129](https://github.com/t-hamano/mark-bricks/issues/129)) ([b0ba5a3](https://github.com/t-hamano/mark-bricks/commit/b0ba5a3b711c46784543d152289d84372cc95cae))
- **vscode:** load the katex fonts in the block canvas ([#136](https://github.com/t-hamano/mark-bricks/issues/136)) ([7687c94](https://github.com/t-hamano/mark-bricks/commit/7687c945d76d468438ab4603d18bc9b0be44e2a9))
- **vscode:** prefer gutenberg translations for strings shared with the editor ([ea6c00d](https://github.com/t-hamano/mark-bricks/commit/ea6c00d59e74dd906c51a066600bdd9db99968fe))

### Features

- **editor:** add translations for the vscode display languages ([#126](https://github.com/t-hamano/mark-bricks/issues/126)) ([a9f3b92](https://github.com/t-hamano/mark-bricks/commit/a9f3b9212b90f7f58177a9e936b962ca6c684acc))
- **editor:** preview math code blocks ([#131](https://github.com/t-hamano/mark-bricks/issues/131)) ([56eaa90](https://github.com/t-hamano/mark-bricks/commit/56eaa90ba5d3d77f0dfee3cdf96054b2bb326d2d))
- **repo:** drop hungarian support, which has no gutenberg language pack ([e305724](https://github.com/t-hamano/mark-bricks/commit/e305724d6f2c5f2ecc01c89ed27338a063461b3d))
- **vscode:** add theme setting to override the vscode color theme ([#122](https://github.com/t-hamano/mark-bricks/issues/122)) ([2717131](https://github.com/t-hamano/mark-bricks/commit/2717131728d64f28d87468941b2d9b405d8591a0))
- **vscode:** add translations for all vscode display languages ([#123](https://github.com/t-hamano/mark-bricks/issues/123)) ([35b1e6c](https://github.com/t-hamano/mark-bricks/commit/35b1e6c4329143d13b2972bfa159b2e78ba78214))

# [0.2.0](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.1.1...vscode-v0.2.0) (2026-09-27)

### Bug Fixes

- **editor:** display inline images with local paths ([#101](https://github.com/t-hamano/mark-bricks/issues/101)) ([d0fe235](https://github.com/t-hamano/mark-bricks/commit/d0fe2358fd623d823d40eeadc5c36296ced7944f))
- **editor:** restrict summary html to supported inline formats ([#116](https://github.com/t-hamano/mark-bricks/issues/116)) ([1c3b254](https://github.com/t-hamano/mark-bricks/commit/1c3b254b0d3c658d91db2c15247791ad38e88b0b))
- **repo:** update dependencies to address security advisories ([c635414](https://github.com/t-hamano/mark-bricks/commit/c6354144dd5f79257aa8035bebdb57dde22bfdb2))
- share image path parsing between the vs code and tauri apps ([#114](https://github.com/t-hamano/mark-bricks/issues/114)) ([896e0ee](https://github.com/t-hamano/mark-bricks/commit/896e0ee319d2ffaf66c17b2415ddf4de25b256c8))
- **vscode:** add a local file picker for images ([#102](https://github.com/t-hamano/mark-bricks/issues/102)) ([0f63e3f](https://github.com/t-hamano/mark-bricks/commit/0f63e3f5158ccf75f007cf161afe33e7612fe8e4))
- **vscode:** stop echoing the extension's own edits back to the webview ([#108](https://github.com/t-hamano/mark-bricks/issues/108)) ([14c6554](https://github.com/t-hamano/mark-bricks/commit/14c6554f6f86301bd23d2b71163bb1d022e33dc3))

### Features

- **editor:** add a callback prop that fires once the canvas shows a block ([#110](https://github.com/t-hamano/mark-bricks/issues/110)) ([01dc4c6](https://github.com/t-hamano/mark-bricks/commit/01dc4c68d6d5ae9773abd2ddcb6d54152fc410ea))
- **editor:** add a toolbar button to insert and edit inline images ([#100](https://github.com/t-hamano/mark-bricks/issues/100)) ([9dd7a67](https://github.com/t-hamano/mark-bricks/commit/9dd7a67908bac41e5097c7da2c33b3ebe8bade73))
- **editor:** let the host warn about image paths it cannot display ([#103](https://github.com/t-hamano/mark-bricks/issues/103)) ([729effa](https://github.com/t-hamano/mark-bricks/commit/729effaebdfe3ba3c7051f2ff24198c6207f69fd))
- **editor:** streamline the image block placeholder and toolbar ([30bde78](https://github.com/t-hamano/mark-bricks/commit/30bde78ae1a9b72f9e78191229df2b72ac7a483e))
- **editor:** support inline and linked images ([#96](https://github.com/t-hamano/mark-bricks/issues/96)) ([6560e2e](https://github.com/t-hamano/mark-bricks/commit/6560e2eac82025f282576018012bc8c6b7de8304))
- **vscode:** add editor settings to the extension configuration ([#95](https://github.com/t-hamano/mark-bricks/issues/95)) ([f62ba2f](https://github.com/t-hamano/mark-bricks/commit/f62ba2f9e6ae14e2ef9557f63eb29f9cf07cff16))

## [0.1.1](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.1.0...vscode-v0.1.1) (2026-09-24)

### Bug Fixes

- **vscode:** rename custom editor display name to visual editor ([84ddf3d](https://github.com/t-hamano/mark-bricks/commit/84ddf3dda3de0ea0bf2c1ffa869d381ed402e09a))

### Features

- **editor:** add yaml front matter editor ([#91](https://github.com/t-hamano/mark-bricks/issues/91)) ([25d6836](https://github.com/t-hamano/mark-bricks/commit/25d6836b18514078ddcc99c41ebb88e77e386d79))
- **vscode:** add localization infrastructure and japanese translations ([#93](https://github.com/t-hamano/mark-bricks/issues/93)) ([309fade](https://github.com/t-hamano/mark-bricks/commit/309fade7a67ef6a18054ab3d82e2b4aedd069d1c))
- **vscode:** add options menu with yaml front matter toggle ([#92](https://github.com/t-hamano/mark-bricks/issues/92)) ([a03a261](https://github.com/t-hamano/mark-bricks/commit/a03a2610344e8affb4150bb769096dfbbc4a7caa))
- **vscode:** publish the extension to the vscode marketplace as a preview ([74fff44](https://github.com/t-hamano/mark-bricks/commit/74fff445e0e8ba5e63a86a03efb336969bd46437))

## 0.1.0 (2026-09-24)

### Features

- **vscode:** add initial vscode extension ([#78](https://github.com/t-hamano/mark-bricks/issues/78)) ([f51cbf3](https://github.com/t-hamano/mark-bricks/commit/f51cbf39a2e4ebd5f3165a157b345fd286aedd44))
