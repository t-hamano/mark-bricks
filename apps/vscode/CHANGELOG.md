# [0.6.0](https://github.com/t-hamano/mark-bricks/compare/vscode-v0.5.0...vscode-v0.6.0) (2026-11-15)

### Bug Fixes

- **editor:** count the selected block's lines in the document as written ([#264](https://github.com/t-hamano/mark-bricks/issues/264)) ([3e70e29](https://github.com/t-hamano/mark-bricks/commit/3e70e294e315e04caa4dd247b07637ff51d34f58))
- **editor:** keep the original emphasis marker when serializing ([#291](https://github.com/t-hamano/mark-bricks/issues/291)) ([4f94262](https://github.com/t-hamano/mark-bricks/commit/4f942621ad8cab30b786e8f3c12674dd2c4c0bf1))
- **editor:** keep the selection outline around the slide separator ([#275](https://github.com/t-hamano/mark-bricks/issues/275)) ([81a03c6](https://github.com/t-hamano/mark-bricks/commit/81a03c6fd72e28adbed6bf4b16b4d41d5b0e30fb))
- **editor:** separate the slide pattern category filter with a border ([#296](https://github.com/t-hamano/mark-bricks/issues/296)) ([3e0ffa8](https://github.com/t-hamano/mark-bricks/commit/3e0ffa891007d0a84e12aaf8d5a588336a9238c8))
- **editor:** show the pointer cursor over every slide pattern preview ([#297](https://github.com/t-hamano/mark-bricks/issues/297)) ([d78d4a1](https://github.com/t-hamano/mark-bricks/commit/d78d4a123813a74da2d8778336e726a6cfe3818b))
- **editor:** use a png for the slide pattern placeholder image ([#267](https://github.com/t-hamano/mark-bricks/issues/267)) ([09d017c](https://github.com/t-hamano/mark-bricks/commit/09d017ccc9990d6488b6ddb5fddd9d0581c138d6))
- **repo:** translate the slide preview placement buttons ([#321](https://github.com/t-hamano/mark-bricks/issues/321)) ([caa60a3](https://github.com/t-hamano/mark-bricks/commit/caa60a3cbef005c3f661d1aee778da05cb524438))
- **repo:** use one japanese term for document ([#341](https://github.com/t-hamano/mark-bricks/issues/341)) ([7726f2f](https://github.com/t-hamano/mark-bricks/commit/7726f2fb062e3a0d1b9829604287fc10a1d6fba4))
- **vscode:** ignore setting updates the webview may not change ([#344](https://github.com/t-hamano/mark-bricks/issues/344)) ([d0f3cba](https://github.com/t-hamano/mark-bricks/commit/d0f3cba9979ad0d594002f817f101f83a26a4b83))

### Features

- **editor:** add a marp toggle to the front matter settings ([#241](https://github.com/t-hamano/mark-bricks/issues/241)) ([f70eaa7](https://github.com/t-hamano/mark-bricks/commit/f70eaa76de2e3220902db8658f74d3dc67fb17bb))
- **editor:** add a modal to explore all slide patterns ([#293](https://github.com/t-hamano/mark-bricks/issues/293)) ([94fed4f](https://github.com/t-hamano/mark-bricks/commit/94fed4f98dd34af65183f7688353d7382f39acdc))
- **editor:** add a side panel to the right of the content ([#268](https://github.com/t-hamano/mark-bricks/issues/268)) ([a69e2c7](https://github.com/t-hamano/mark-bricks/commit/a69e2c75e4c7dc7c2e2713d19bebac8297bff0c6))
- **editor:** add a slide patterns tab to the inserter in marp mode ([#254](https://github.com/t-hamano/mark-bricks/issues/254)) ([40b7dc8](https://github.com/t-hamano/mark-bricks/commit/40b7dc8506306af2d829f40d97fac48ee63ad7fc))
- **editor:** add color scheme and font presets to the marp front matter settings ([#357](https://github.com/t-hamano/mark-bricks/issues/357)) ([ca120e9](https://github.com/t-hamano/mark-bricks/commit/ca120e99dd41484fe617e5fdaa3ec000870c69bf))
- **editor:** add marp slide settings to the front matter ([#247](https://github.com/t-hamano/mark-bricks/issues/247)) ([07153c9](https://github.com/t-hamano/mark-bricks/commit/07153c9d7979e890f28a15042aea79ff22eb5e45))
- **editor:** add more slide patterns and group them by category ([#281](https://github.com/t-hamano/mark-bricks/issues/281)) ([aa86a3d](https://github.com/t-hamano/mark-bricks/commit/aa86a3d1a43b0b3146528f94a6a05c7e575d00c9))
- **editor:** add slide pattern definitions for marp mode ([#245](https://github.com/t-hamano/mark-bricks/issues/245)) ([4f629e9](https://github.com/t-hamano/mark-bricks/commit/4f629e9a6a98fedb32e2acc72a6cb0cd1bf3b6a3))
- **editor:** add slide patterns with a scoped style of their own ([#308](https://github.com/t-hamano/mark-bricks/issues/308)) ([775b6c1](https://github.com/t-hamano/mark-bricks/commit/775b6c10fc12bde8c1d8737095e5cc2d934e7a02))
- **editor:** add the edit target for the text editor ([#240](https://github.com/t-hamano/mark-bricks/issues/240)) ([24bce04](https://github.com/t-hamano/mark-bricks/commit/24bce04a3dbc82bf49983c3608ae4ee13d5d2219))
- **editor:** add the edit target for the visual editor ([#238](https://github.com/t-hamano/mark-bricks/issues/238)) ([f434467](https://github.com/t-hamano/mark-bricks/commit/f434467fec127ccb309e77bc86fa2a84dd3da441))
- **editor:** filter slide patterns by category in the inserter ([#283](https://github.com/t-hamano/mark-bricks/issues/283)) ([95ac6ff](https://github.com/t-hamano/mark-bricks/commit/95ac6ffc3b1af41d66a96ff904c9fe2d88bc43a9))
- **editor:** label the separator block as a slide break in marp mode ([#261](https://github.com/t-hamano/mark-bricks/issues/261)) ([d6c8ee5](https://github.com/t-hamano/mark-bricks/commit/d6c8ee53fc08f77392e13d22abc475f734ac3201))
- **editor:** let the user resize the side panel ([#279](https://github.com/t-hamano/mark-bricks/issues/279)) ([76239d4](https://github.com/t-hamano/mark-bricks/commit/76239d4c4654ff981b87416d380e56a99bb90c23))
- **editor:** link the selected block to its source lines ([#249](https://github.com/t-hamano/mark-bricks/issues/249)) ([e0ad71e](https://github.com/t-hamano/mark-bricks/commit/e0ad71e8d5629d0281e4c885e0dda2ac0476568e))
- **editor:** rename the separator block to slide separator in marp mode ([#256](https://github.com/t-hamano/mark-bricks/issues/256)) ([42e0462](https://github.com/t-hamano/mark-bricks/commit/42e0462e9f048de139841ca6dd82d5355dcdb27b))
- **editor:** render slide pattern previews ahead of time ([#265](https://github.com/t-hamano/mark-bricks/issues/265)) ([56cd16c](https://github.com/t-hamano/mark-bricks/commit/56cd16c2540a0210d57b11b1f8d35aae0c9c4d86))
- **editor:** rework the slide patterns around their layouts ([#298](https://github.com/t-hamano/mark-bricks/issues/298)) ([81fee60](https://github.com/t-hamano/mark-bricks/commit/81fee60d53700bca2edefb753b76fefc67959c4e))
- **editor:** set marp image placement from dedicated settings ([#312](https://github.com/t-hamano/mark-bricks/issues/312)) ([67c0b6b](https://github.com/t-hamano/mark-bricks/commit/67c0b6b73a678d92148279fb76f431d093a15ccc))
- **editor:** set marp slide directives of an html block from a form ([#324](https://github.com/t-hamano/mark-bricks/issues/324)) ([4c9fae8](https://github.com/t-hamano/mark-bricks/commit/4c9fae85f4c868b1f8144e3d99ecbf2ca0d3a390))
- **editor:** show insertion point when hovering inserter items ([#276](https://github.com/t-hamano/mark-bricks/issues/276)) ([dec809d](https://github.com/t-hamano/mark-bricks/commit/dec809d3d005dca85ba8f49c94b9ae030cb8d589))
- **editor:** show slide pattern previews in the inserter ([#273](https://github.com/t-hamano/mark-bricks/issues/273)) ([d4bb401](https://github.com/t-hamano/mark-bricks/commit/d4bb401f40157ae9fe10267aff51072bf66e4ed8))
- **editor:** stretch the slide separator across the canvas in marp mode ([#278](https://github.com/t-hamano/mark-bricks/issues/278)) ([ca2774c](https://github.com/t-hamano/mark-bricks/commit/ca2774ca7de12c881c9c4bb25664132924db2395))
- **repo:** add a button that moves the slide preview between a panel and a window ([#270](https://github.com/t-hamano/mark-bricks/issues/270)) ([cd17376](https://github.com/t-hamano/mark-bricks/commit/cd1737606ee30e226036b417627980cf11ad96d9))
- **repo:** keep the marp preview's slide mode on the shown slide ([#263](https://github.com/t-hamano/mark-bricks/issues/263)) ([fa49122](https://github.com/t-hamano/mark-bricks/commit/fa49122cc749b705c06b47a1b5d01b9e8f6bd408))
- **repo:** let a click on a slide's padding stand for the whole slide ([#258](https://github.com/t-hamano/mark-bricks/issues/258)) ([984f720](https://github.com/t-hamano/mark-bricks/commit/984f72072eb5367ef3b92daa353e9eff9aaabe3f))
- **repo:** let the marp preview follow the markdown by slide ([#251](https://github.com/t-hamano/mark-bricks/issues/251)) ([89b5ca3](https://github.com/t-hamano/mark-bricks/commit/89b5ca3bef9b1e729c57124c944c08e6f1a97c45))
- **repo:** link the marp preview's elements to their source lines ([#246](https://github.com/t-hamano/mark-bricks/issues/246)) ([cbf72ae](https://github.com/t-hamano/mark-bricks/commit/cbf72ae384229e2f443b2809cf3364e4fbedcb69))
- **vscode:** link the preview's elements to the editor's blocks ([#260](https://github.com/t-hamano/mark-bricks/issues/260)) ([7e3c5ea](https://github.com/t-hamano/mark-bricks/commit/7e3c5ea136603af4f1edb8cbbde287b51fbe16c5))
- **vscode:** sync the slide preview with the selected block ([#255](https://github.com/t-hamano/mark-bricks/issues/255)) ([5ac91a4](https://github.com/t-hamano/mark-bricks/commit/5ac91a44a15caab9e7c0d2a1f901085c433cb615))

### Performance Improvements

- **editor:** leave the unused monaco language services out of the bundle ([#330](https://github.com/t-hamano/mark-bricks/issues/330)) ([112e4ba](https://github.com/t-hamano/mark-bricks/commit/112e4bae43dd6f5d26390ab2ba95ac9d434ce8c0))
- **editor:** load only the translations of the applied locale ([#328](https://github.com/t-hamano/mark-bricks/issues/328)) ([506131c](https://github.com/t-hamano/mark-bricks/commit/506131c8d8551e73f0f071588ecbc2803405fe20))
- **repo:** leave the unused image processing worker out of the apps ([#331](https://github.com/t-hamano/mark-bricks/issues/331)) ([dc7e2cf](https://github.com/t-hamano/mark-bricks/commit/dc7e2cff889643af041c9458e115d99a100a4c6e))

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
