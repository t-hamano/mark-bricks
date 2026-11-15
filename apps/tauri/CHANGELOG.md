# [0.18.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.17.0...tauri-v0.18.0) (2026-11-15)

### Bug Fixes

- **ai:** make table borders in answers easier to see ([#378](https://github.com/t-hamano/mark-bricks/issues/378)) ([87f4446](https://github.com/t-hamano/mark-bricks/commit/87f44467e9c914ca8f4cdc9176268597e57df986))
- **editor:** count the selected block's lines in the document as written ([#264](https://github.com/t-hamano/mark-bricks/issues/264)) ([3e70e29](https://github.com/t-hamano/mark-bricks/commit/3e70e294e315e04caa4dd247b07637ff51d34f58))
- **editor:** keep front matter intact when applying ai edits ([#315](https://github.com/t-hamano/mark-bricks/issues/315)) ([9b58844](https://github.com/t-hamano/mark-bricks/commit/9b588445a9da071354210289596cd2011dc0bdf1))
- **editor:** keep the ai assistant's view of the document accurate ([#349](https://github.com/t-hamano/mark-bricks/issues/349)) ([6e97e2a](https://github.com/t-hamano/mark-bricks/commit/6e97e2ab60ea39a5a7974a74617d557021a9cb22))
- **editor:** keep the original emphasis marker when serializing ([#291](https://github.com/t-hamano/mark-bricks/issues/291)) ([4f94262](https://github.com/t-hamano/mark-bricks/commit/4f942621ad8cab30b786e8f3c12674dd2c4c0bf1))
- **editor:** keep the selection outline around the slide separator ([#275](https://github.com/t-hamano/mark-bricks/issues/275)) ([81a03c6](https://github.com/t-hamano/mark-bricks/commit/81a03c6fd72e28adbed6bf4b16b4d41d5b0e30fb))
- **editor:** separate the slide pattern category filter with a border ([#296](https://github.com/t-hamano/mark-bricks/issues/296)) ([3e0ffa8](https://github.com/t-hamano/mark-bricks/commit/3e0ffa891007d0a84e12aaf8d5a588336a9238c8))
- **editor:** show the pointer cursor over every slide pattern preview ([#297](https://github.com/t-hamano/mark-bricks/issues/297)) ([d78d4a1](https://github.com/t-hamano/mark-bricks/commit/d78d4a123813a74da2d8778336e726a6cfe3818b))
- **editor:** use a png for the slide pattern placeholder image ([#267](https://github.com/t-hamano/mark-bricks/issues/267)) ([09d017c](https://github.com/t-hamano/mark-bricks/commit/09d017ccc9990d6488b6ddb5fddd9d0581c138d6))
- **repo:** translate the slide preview placement buttons ([#321](https://github.com/t-hamano/mark-bricks/issues/321)) ([caa60a3](https://github.com/t-hamano/mark-bricks/commit/caa60a3cbef005c3f661d1aee778da05cb524438))
- **repo:** use one japanese term for document ([#341](https://github.com/t-hamano/mark-bricks/issues/341)) ([7726f2f](https://github.com/t-hamano/mark-bricks/commit/7726f2fb062e3a0d1b9829604287fc10a1d6fba4))
- **tauri:** encode the locale in the slide preview window url ([#345](https://github.com/t-hamano/mark-bricks/issues/345)) ([5bff779](https://github.com/t-hamano/mark-bricks/commit/5bff779b384806e9d3ebdce07c82bf6902cb87de))
- **tauri:** keep the ai api key from following redirects ([#323](https://github.com/t-hamano/mark-bricks/issues/323)) ([da37221](https://github.com/t-hamano/mark-bricks/commit/da372214d7f8e4e43b3b69b8f14fd1a3ad44ce34))
- **tauri:** keep the options menu from crashing the app in dev builds ([#377](https://github.com/t-hamano/mark-bricks/issues/377)) ([4cc4e18](https://github.com/t-hamano/mark-bricks/commit/4cc4e18b4bacc8c2713ae3208b928d5ae26dcac8))
- **tauri:** keep the preview on the selected slide across renders ([#257](https://github.com/t-hamano/mark-bricks/issues/257)) ([47d2cc7](https://github.com/t-hamano/mark-bricks/commit/47d2cc7bb32eb15faee7963c57054bc5b52ea0b9))
- **tauri:** open the marp documentation link in the browser ([#250](https://github.com/t-hamano/mark-bricks/issues/250)) ([af87ebc](https://github.com/t-hamano/mark-bricks/commit/af87ebcb6215849793aa1d0f60fe5e56d8f0e7af))
- **tauri:** recover the pending file list from a poisoned lock ([#350](https://github.com/t-hamano/mark-bricks/issues/350)) ([28c6f1f](https://github.com/t-hamano/mark-bricks/commit/28c6f1ff314cc47b73360c3bd82e7087bca7550f))
- **tauri:** save the font family instead of its font stack ([#365](https://github.com/t-hamano/mark-bricks/issues/365)) ([b88ccd6](https://github.com/t-hamano/mark-bricks/commit/b88ccd60d7ecc5f79dfd7e8be14795972715b7b3))
- **tauri:** stop freezing while asking to become the default markdown app ([#346](https://github.com/t-hamano/mark-bricks/issues/346)) ([e862e4e](https://github.com/t-hamano/mark-bricks/commit/e862e4efeee281f3b0f152fa21b79794c72aff1d))

### Features

- **ai:** hide the ai assistant button until an api key is saved ([#376](https://github.com/t-hamano/mark-bricks/issues/376)) ([8b5523e](https://github.com/t-hamano/mark-bricks/commit/8b5523e73476c9c024ee60be41aa9ff32804616a))
- **editor:** add a marp syntax guide to the ai prompt for slide decks ([#327](https://github.com/t-hamano/mark-bricks/issues/327)) ([9d5d185](https://github.com/t-hamano/mark-bricks/commit/9d5d185ec546ffaf5db16cd930b444f028a42124))
- **editor:** add a marp toggle to the front matter settings ([#241](https://github.com/t-hamano/mark-bricks/issues/241)) ([f70eaa7](https://github.com/t-hamano/mark-bricks/commit/f70eaa76de2e3220902db8658f74d3dc67fb17bb))
- **editor:** add a modal to explore all slide patterns ([#293](https://github.com/t-hamano/mark-bricks/issues/293)) ([94fed4f](https://github.com/t-hamano/mark-bricks/commit/94fed4f98dd34af65183f7688353d7382f39acdc))
- **editor:** add a side panel to the right of the content ([#268](https://github.com/t-hamano/mark-bricks/issues/268)) ([a69e2c7](https://github.com/t-hamano/mark-bricks/commit/a69e2c75e4c7dc7c2e2713d19bebac8297bff0c6))
- **editor:** add a slide patterns tab to the inserter in marp mode ([#254](https://github.com/t-hamano/mark-bricks/issues/254)) ([40b7dc8](https://github.com/t-hamano/mark-bricks/commit/40b7dc8506306af2d829f40d97fac48ee63ad7fc))
- **editor:** add color scheme and font presets to the marp front matter settings ([#357](https://github.com/t-hamano/mark-bricks/issues/357)) ([ca120e9](https://github.com/t-hamano/mark-bricks/commit/ca120e99dd41484fe617e5fdaa3ec000870c69bf))
- **editor:** add marp slide settings to the front matter ([#247](https://github.com/t-hamano/mark-bricks/issues/247)) ([07153c9](https://github.com/t-hamano/mark-bricks/commit/07153c9d7979e890f28a15042aea79ff22eb5e45))
- **editor:** add more slide patterns and group them by category ([#281](https://github.com/t-hamano/mark-bricks/issues/281)) ([aa86a3d](https://github.com/t-hamano/mark-bricks/commit/aa86a3d1a43b0b3146528f94a6a05c7e575d00c9))
- **editor:** add slide pattern definitions for marp mode ([#245](https://github.com/t-hamano/mark-bricks/issues/245)) ([4f629e9](https://github.com/t-hamano/mark-bricks/commit/4f629e9a6a98fedb32e2acc72a6cb0cd1bf3b6a3))
- **editor:** add slide patterns with a scoped style of their own ([#308](https://github.com/t-hamano/mark-bricks/issues/308)) ([775b6c1](https://github.com/t-hamano/mark-bricks/commit/775b6c10fc12bde8c1d8737095e5cc2d934e7a02))
- **editor:** add the ai assistant sidebar ([#239](https://github.com/t-hamano/mark-bricks/issues/239)) ([0fa21e4](https://github.com/t-hamano/mark-bricks/commit/0fa21e460cf53693740582146b3d15c174bc6038))
- **editor:** add the ai platform integration point ([#237](https://github.com/t-hamano/mark-bricks/issues/237)) ([05699d2](https://github.com/t-hamano/mark-bricks/commit/05699d26d5ff35d212d30a75556d7667d4268c2b))
- **editor:** add the chat to the ai assistant sidebar ([#248](https://github.com/t-hamano/mark-bricks/issues/248)) ([29c834f](https://github.com/t-hamano/mark-bricks/commit/29c834f5b574f84ad5f920b7347ce5d400fde9b0))
- **editor:** add the edit target for the text editor ([#240](https://github.com/t-hamano/mark-bricks/issues/240)) ([24bce04](https://github.com/t-hamano/mark-bricks/commit/24bce04a3dbc82bf49983c3608ae4ee13d5d2219))
- **editor:** add the edit target for the visual editor ([#238](https://github.com/t-hamano/mark-bricks/issues/238)) ([f434467](https://github.com/t-hamano/mark-bricks/commit/f434467fec127ccb309e77bc86fa2a84dd3da441))
- **editor:** filter slide patterns by category in the inserter ([#283](https://github.com/t-hamano/mark-bricks/issues/283)) ([95ac6ff](https://github.com/t-hamano/mark-bricks/commit/95ac6ffc3b1af41d66a96ff904c9fe2d88bc43a9))
- **editor:** format the markdown in ai assistant answers ([#317](https://github.com/t-hamano/mark-bricks/issues/317)) ([72d10ff](https://github.com/t-hamano/mark-bricks/commit/72d10ffd23d61b47434fecb405002f702a22a6fe))
- **editor:** label the separator block as a slide break in marp mode ([#261](https://github.com/t-hamano/mark-bricks/issues/261)) ([d6c8ee5](https://github.com/t-hamano/mark-bricks/commit/d6c8ee53fc08f77392e13d22abc475f734ac3201))
- **editor:** let the ai assistant replace text it finds in the document ([#325](https://github.com/t-hamano/mark-bricks/issues/325)) ([81c2648](https://github.com/t-hamano/mark-bricks/commit/81c26482a1e16458e8275991c80cbca0c8de0169))
- **editor:** let the user resize the side panel ([#279](https://github.com/t-hamano/mark-bricks/issues/279)) ([76239d4](https://github.com/t-hamano/mark-bricks/commit/76239d4c4654ff981b87416d380e56a99bb90c23))
- **editor:** link the selected block to its source lines ([#249](https://github.com/t-hamano/mark-bricks/issues/249)) ([e0ad71e](https://github.com/t-hamano/mark-bricks/commit/e0ad71e8d5629d0281e4c885e0dda2ac0476568e))
- **editor:** rename the separator block to slide separator in marp mode ([#256](https://github.com/t-hamano/mark-bricks/issues/256)) ([42e0462](https://github.com/t-hamano/mark-bricks/commit/42e0462e9f048de139841ca6dd82d5355dcdb27b))
- **editor:** render slide pattern previews ahead of time ([#265](https://github.com/t-hamano/mark-bricks/issues/265)) ([56cd16c](https://github.com/t-hamano/mark-bricks/commit/56cd16c2540a0210d57b11b1f8d35aae0c9c4d86))
- **editor:** rework the slide patterns around their layouts ([#298](https://github.com/t-hamano/mark-bricks/issues/298)) ([81fee60](https://github.com/t-hamano/mark-bricks/commit/81fee60d53700bca2edefb753b76fefc67959c4e))
- **editor:** set marp image placement from dedicated settings ([#312](https://github.com/t-hamano/mark-bricks/issues/312)) ([67c0b6b](https://github.com/t-hamano/mark-bricks/commit/67c0b6b73a678d92148279fb76f431d093a15ccc))
- **editor:** set marp slide directives of an html block from a form ([#324](https://github.com/t-hamano/mark-bricks/issues/324)) ([4c9fae8](https://github.com/t-hamano/mark-bricks/commit/4c9fae85f4c868b1f8144e3d99ecbf2ca0d3a390))
- **editor:** show insertion point when hovering inserter items ([#276](https://github.com/t-hamano/mark-bricks/issues/276)) ([dec809d](https://github.com/t-hamano/mark-bricks/commit/dec809d3d005dca85ba8f49c94b9ae030cb8d589))
- **editor:** show slide pattern previews in the inserter ([#273](https://github.com/t-hamano/mark-bricks/issues/273)) ([d4bb401](https://github.com/t-hamano/mark-bricks/commit/d4bb401f40157ae9fe10267aff51072bf66e4ed8))
- **editor:** show the ai assistant's selection and refine its chat ([#282](https://github.com/t-hamano/mark-bricks/issues/282)) ([f3b630c](https://github.com/t-hamano/mark-bricks/commit/f3b630c13bd6e361360fad2e75a2b2d5c73521eb))
- **editor:** show the ai tokens read from the cache ([#351](https://github.com/t-hamano/mark-bricks/issues/351)) ([f563002](https://github.com/t-hamano/mark-bricks/commit/f563002d9ba56ea84cfc2b4a53fe8e0bc9cf6816))
- **editor:** show the tokens each ai assistant answer used ([#310](https://github.com/t-hamano/mark-bricks/issues/310)) ([4c13d59](https://github.com/t-hamano/mark-bricks/commit/4c13d59756e15b0086e20303f66f6a12cf3d236e))
- **editor:** show what the ai assistant is doing while it answers ([#299](https://github.com/t-hamano/mark-bricks/issues/299)) ([4a13899](https://github.com/t-hamano/mark-bricks/commit/4a13899f9a3a62411a5b8083a4ef7f32fb68a6e5))
- **editor:** stretch the slide separator across the canvas in marp mode ([#278](https://github.com/t-hamano/mark-bricks/issues/278)) ([ca2774c](https://github.com/t-hamano/mark-bricks/commit/ca2774ca7de12c881c9c4bb25664132924db2395))
- **repo:** add a button that moves the slide preview between a panel and a window ([#270](https://github.com/t-hamano/mark-bricks/issues/270)) ([cd17376](https://github.com/t-hamano/mark-bricks/commit/cd1737606ee30e226036b417627980cf11ad96d9))
- **repo:** keep the marp preview's slide mode on the shown slide ([#263](https://github.com/t-hamano/mark-bricks/issues/263)) ([fa49122](https://github.com/t-hamano/mark-bricks/commit/fa49122cc749b705c06b47a1b5d01b9e8f6bd408))
- **repo:** let a click on a slide's padding stand for the whole slide ([#258](https://github.com/t-hamano/mark-bricks/issues/258)) ([984f720](https://github.com/t-hamano/mark-bricks/commit/984f72072eb5367ef3b92daa353e9eff9aaabe3f))
- **repo:** let the marp preview follow the markdown by slide ([#251](https://github.com/t-hamano/mark-bricks/issues/251)) ([89b5ca3](https://github.com/t-hamano/mark-bricks/commit/89b5ca3bef9b1e729c57124c944c08e6f1a97c45))
- **repo:** link the marp preview's elements to their source lines ([#246](https://github.com/t-hamano/mark-bricks/issues/246)) ([cbf72ae](https://github.com/t-hamano/mark-bricks/commit/cbf72ae384229e2f443b2809cf3364e4fbedcb69))
- **tauri:** add custom instructions to the ai assistant settings ([#318](https://github.com/t-hamano/mark-bricks/issues/318)) ([3e5e6e6](https://github.com/t-hamano/mark-bricks/commit/3e5e6e6e1df4c59f433b5b31fa5e18b5f4e6e39d))
- **tauri:** add google gemini as an ai assistant provider ([#314](https://github.com/t-hamano/mark-bricks/issues/314)) ([bd6f486](https://github.com/t-hamano/mark-bricks/commit/bd6f486d13c85852b140426f6a98cd82bf518c8a))
- **tauri:** add openai as an ai assistant provider ([#292](https://github.com/t-hamano/mark-bricks/issues/292)) ([6016d77](https://github.com/t-hamano/mark-bricks/commit/6016d77ec3df5cf09666a30cb25f2b8e145f0f35))
- **tauri:** add the ai assistant's api key and model settings ([#272](https://github.com/t-hamano/mark-bricks/issues/272)) ([5191fbc](https://github.com/t-hamano/mark-bricks/commit/5191fbc552687ef0d237c98dcaa050ba219338d1))
- **tauri:** add the anthropic adapter for the ai assistant ([#252](https://github.com/t-hamano/mark-bricks/issues/252)) ([4da00be](https://github.com/t-hamano/mark-bricks/commit/4da00bef914078c047eb82eb3c3f677eb520a9e1))
- **tauri:** connect the ai assistant to the anthropic api ([#274](https://github.com/t-hamano/mark-bricks/issues/274)) ([fd8f929](https://github.com/t-hamano/mark-bricks/commit/fd8f9295f4ac739383af0cfc851346e0328aa790))
- **tauri:** keep the slide preview's width while the tab is open ([#280](https://github.com/t-hamano/mark-bricks/issues/280)) ([b504afa](https://github.com/t-hamano/mark-bricks/commit/b504afa4fb55689f4a999eba52bcfefbb03fcac3))
- **tauri:** let the ai assistant edit the part the user means without a selection ([#326](https://github.com/t-hamano/mark-bricks/issues/326)) ([3ffc71a](https://github.com/t-hamano/mark-bricks/commit/3ffc71a60a7b40098016b1821b896a9de7bcf44a))
- **tauri:** let the preferences controls fill the modal's width ([#307](https://github.com/t-hamano/mark-bricks/issues/307)) ([bacf9f1](https://github.com/t-hamano/mark-bricks/commit/bacf9f1a40237ffed7452594ff5c32d32ae553df))
- **tauri:** let the slide preview move between the editor and a window ([#271](https://github.com/t-hamano/mark-bricks/issues/271)) ([8a88ec3](https://github.com/t-hamano/mark-bricks/commit/8a88ec3dfa6eb5c48a011e4587c508f2f687d2c0))
- **tauri:** link the preview's elements to the editor's blocks ([#259](https://github.com/t-hamano/mark-bricks/issues/259)) ([37c76fb](https://github.com/t-hamano/mark-bricks/commit/37c76fb3a98574495ea50c743bde08060f22f7ec))
- **tauri:** report the ai tokens read from the cache ([#353](https://github.com/t-hamano/mark-bricks/issues/353)) ([18e7fd3](https://github.com/t-hamano/mark-bricks/commit/18e7fd39555c1cbe63f01a1ae22d8a7860cb4c9b))
- **tauri:** report the tokens of ai assistant answers and link to usage pages ([#311](https://github.com/t-hamano/mark-bricks/issues/311)) ([bece59f](https://github.com/t-hamano/mark-bricks/commit/bece59f1f79237cedab40bc0ed319c5737384657))
- **tauri:** report when the ai assistant thinks and edits ([#300](https://github.com/t-hamano/mark-bricks/issues/300)) ([efe2f72](https://github.com/t-hamano/mark-bricks/commit/efe2f72910e6e078704e4818df035479f64aeb14))
- **tauri:** send the ai assistant's requests through the native side ([#266](https://github.com/t-hamano/mark-bricks/issues/266)) ([24e9200](https://github.com/t-hamano/mark-bricks/commit/24e920092363e22a39e293739bfd9f3faa1488eb))
- **tauri:** set up each ai assistant provider in its own card ([#305](https://github.com/t-hamano/mark-bricks/issues/305)) ([9ff0006](https://github.com/t-hamano/mark-bricks/commit/9ff00068b1092373f6a79b719e111ff2e19fc73d))
- **tauri:** show a not connected badge on ai provider cards ([#313](https://github.com/t-hamano/mark-bricks/issues/313)) ([8b299f6](https://github.com/t-hamano/mark-bricks/commit/8b299f6a58c0ad83be5c7c9af10d7afc2ea14ba0))
- **tauri:** show the api key storage note once above the provider cards ([#319](https://github.com/t-hamano/mark-bricks/issues/319)) ([eb76339](https://github.com/t-hamano/mark-bricks/commit/eb76339c66244e29b1ca7c0b9c7d3a6fdce7796b))
- **tauri:** show the slide preview next to the editor ([#269](https://github.com/t-hamano/mark-bricks/issues/269)) ([3081e39](https://github.com/t-hamano/mark-bricks/commit/3081e391efa8c124c4f627182529118ddde5a80c))
- **tauri:** store the ai assistant's api key in the os credential store ([#262](https://github.com/t-hamano/mark-bricks/issues/262)) ([8fda85f](https://github.com/t-hamano/mark-bricks/commit/8fda85f020824cc62fafa6d3b217e3f11425ae05))
- **tauri:** sync the slide preview with the selected block ([#253](https://github.com/t-hamano/mark-bricks/issues/253)) ([a5b39ad](https://github.com/t-hamano/mark-bricks/commit/a5b39ad0ad9f054a42adf5890d9ca244fe739113))
- **tauri:** tidy the ai assistant settings cards ([#322](https://github.com/t-hamano/mark-bricks/issues/322)) ([d5512aa](https://github.com/t-hamano/mark-bricks/commit/d5512aa6172c71839eeea5705b2ded955ce97a04))

### Performance Improvements

- **editor:** leave the unused monaco language services out of the bundle ([#330](https://github.com/t-hamano/mark-bricks/issues/330)) ([112e4ba](https://github.com/t-hamano/mark-bricks/commit/112e4bae43dd6f5d26390ab2ba95ac9d434ce8c0))
- **editor:** load only the translations of the applied locale ([#328](https://github.com/t-hamano/mark-bricks/issues/328)) ([506131c](https://github.com/t-hamano/mark-bricks/commit/506131c8d8551e73f0f071588ecbc2803405fe20))
- **editor:** send the ai assistant only the document changes after the first message ([#343](https://github.com/t-hamano/mark-bricks/issues/343)) ([218b5e0](https://github.com/t-hamano/mark-bricks/commit/218b5e0aff4d99c1f250662d35b321d15ee00960))
- **repo:** leave the unused image processing worker out of the apps ([#331](https://github.com/t-hamano/mark-bricks/issues/331)) ([dc7e2cf](https://github.com/t-hamano/mark-bricks/commit/dc7e2cff889643af041c9458e115d99a100a4c6e))
- **tauri:** cache the ai conversation of anthropic requests ([#348](https://github.com/t-hamano/mark-bricks/issues/348)) ([9668bf6](https://github.com/t-hamano/mark-bricks/commit/9668bf608a2ddbd1b2caf36a7d6647ce310663c1))
- **tauri:** cache the ai instructions apart from the document ([#329](https://github.com/t-hamano/mark-bricks/issues/329)) ([0c1df51](https://github.com/t-hamano/mark-bricks/commit/0c1df513de6115a216d9f6922f40ba8ebdff8d18))
- **tauri:** cache the system prompt of anthropic requests ([#316](https://github.com/t-hamano/mark-bricks/issues/316)) ([2c2cd0b](https://github.com/t-hamano/mark-bricks/commit/2c2cd0bafafa8b56c4a016fccfbb799ac16db499))
- **tauri:** load the preferences setup after the editor starts ([#340](https://github.com/t-hamano/mark-bricks/issues/340)) ([ee549ed](https://github.com/t-hamano/mark-bricks/commit/ee549ed5657b81a12d152365065d630d7e7d2ea3))

# [0.17.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.16.0...tauri-v0.17.0) (2026-11-08)

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
- **tauri:** update rustls to address security advisories ([#236](https://github.com/t-hamano/mark-bricks/issues/236)) ([d1748aa](https://github.com/t-hamano/mark-bricks/commit/d1748aab426df1d693672224d93c3bf6cef1ba46))

### Features

- **editor:** explain marp image keywords in the image alt text field ([#165](https://github.com/t-hamano/mark-bricks/issues/165)) ([e58629f](https://github.com/t-hamano/mark-bricks/commit/e58629f8dc591f79bf5372b350499a2635e13f9a))
- **editor:** hide the empty text of a list item that opens with a block ([#231](https://github.com/t-hamano/mark-bricks/issues/231)) ([bad278b](https://github.com/t-hamano/mark-bricks/commit/bad278b42332acfb12f8efe3b3f3a1447a9bca39))
- **editor:** merge list item text with an inner paragraph on delete and backspace ([#232](https://github.com/t-hamano/mark-bricks/issues/232)) ([5bc8ea8](https://github.com/t-hamano/mark-bricks/commit/5bc8ea89a0078e42a8bc5f1c49d2537cbb975ea2))
- **editor:** share the marp check and show the marp mode badge in the editor header ([#167](https://github.com/t-hamano/mark-bricks/issues/167)) ([86d6529](https://github.com/t-hamano/mark-bricks/commit/86d6529b8ef1301321d8e050e0b69e6538e4b519))
- **repo:** add an export entry that renders marp decks into standalone html ([#182](https://github.com/t-hamano/mark-bricks/issues/182)) ([81956c5](https://github.com/t-hamano/mark-bricks/commit/81956c53f5ca575791ce6e008730c526cfbf9a4f))
- **repo:** add the preview's toolbar and slide mode to exported marp html ([#188](https://github.com/t-hamano/mark-bricks/issues/188)) ([4b07d2f](https://github.com/t-hamano/mark-bricks/commit/4b07d2f00fd959b5e9047bf438eac8b0c466a932))
- **tauri:** ask about files changed on disk in an in-app dialog ([#234](https://github.com/t-hamano/mark-bricks/issues/234)) ([aaea74c](https://github.com/t-hamano/mark-bricks/commit/aaea74ce5ac9d4d279f1e1724b3fa427cf5bb98d))
- **tauri:** export marp slide decks to html ([#184](https://github.com/t-hamano/mark-bricks/issues/184)) ([d3f955c](https://github.com/t-hamano/mark-bricks/commit/d3f955c9d5984ce2424eb27621dfffc614f7d738))
- **tauri:** export marp slide decks to pdf ([#186](https://github.com/t-hamano/mark-bricks/issues/186)) ([cf1fbf5](https://github.com/t-hamano/mark-bricks/commit/cf1fbf53afb892add3204bb2bb83bcc992d62cc8))
- **tauri:** reload open documents when they change on disk ([#203](https://github.com/t-hamano/mark-bricks/issues/203)) ([0ac883b](https://github.com/t-hamano/mark-bricks/commit/0ac883b428b8a00b78d8f99d6700b5532e938ba3))

# [0.16.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.15.0...tauri-v0.16.0) (2026-10-01)

### Bug Fixes

- **editor:** support attention serialization of mdast-util-to-markdown 2.1.3 ([#153](https://github.com/t-hamano/mark-bricks/issues/153)) ([54d3070](https://github.com/t-hamano/mark-bricks/commit/54d3070ab31eda25e205b6c001ca06d96f8b79e1))
- **tauri:** fit each slide to the preview window height so maximized windows do not cut it off ([8503a21](https://github.com/t-hamano/mark-bricks/commit/8503a2154b315099c94af430cdd43e9696432f49))

### Features

- **editor:** add a math block that reads and writes $$ and ```math ([#144](https://github.com/t-hamano/mark-bricks/issues/144)) ([28e9101](https://github.com/t-hamano/mark-bricks/commit/28e91017ef436176af1168a66d9314e34f72b12d))
- **editor:** keep every block inside a list item ([#130](https://github.com/t-hamano/mark-bricks/issues/130)) ([889f162](https://github.com/t-hamano/mark-bricks/commit/889f162506442f5346b2f212d773bf2407073e6d))
- **tauri:** add a full screen toolbar button and exit hint to the slide preview ([#158](https://github.com/t-hamano/mark-bricks/issues/158)) ([183aff9](https://github.com/t-hamano/mark-bricks/commit/183aff9d1a2f559f5b91d408dc02e387d783fbbc))
- **tauri:** add a pager to the slide preview toolbar ([#162](https://github.com/t-hamano/mark-bricks/issues/162)) ([5199b3b](https://github.com/t-hamano/mark-bricks/commit/5199b3b692a8c64cbbf8590498fc07e81ae612c0))
- **tauri:** move between slides with the keyboard in the full screen preview ([#159](https://github.com/t-hamano/mark-bricks/issues/159)) ([d0db2ed](https://github.com/t-hamano/mark-bricks/commit/d0db2ed05e57ecf71f83b1f7c953f0f52a4ae94a))
- **tauri:** move between slides with the wheel in the full screen preview ([#161](https://github.com/t-hamano/mark-bricks/issues/161)) ([9766934](https://github.com/t-hamano/mark-bricks/commit/97669347ff86dc9b77fe51573f639a2847cc588a))
- **tauri:** open a slide preview window for marp documents ([#148](https://github.com/t-hamano/mark-bricks/issues/148)) ([8536368](https://github.com/t-hamano/mark-bricks/commit/8536368e037f91ab629b9a2437b03a38ee16e804))
- **tauri:** render marp slides in the preview window and keep them in sync with edits ([#150](https://github.com/t-hamano/mark-bricks/issues/150)) ([385a3cb](https://github.com/t-hamano/mark-bricks/commit/385a3cb7a383922baf611cdb99bc948e7c6a71f4))
- **tauri:** send translated labels to the slide preview window ([7d4017b](https://github.com/t-hamano/mark-bricks/commit/7d4017ba94e1dd487adbdde65dd46d408a00b3f5)), closes [#155](https://github.com/t-hamano/mark-bricks/issues/155)
- **tauri:** show local images in the slide preview and a notice for non-marp documents ([#152](https://github.com/t-hamano/mark-bricks/issues/152)) ([ecea754](https://github.com/t-hamano/mark-bricks/commit/ecea7543560f1e83a5109407a5ca025db53bd9e9))
- **tauri:** toggle full screen in the slide preview ([#157](https://github.com/t-hamano/mark-bricks/issues/157)) ([c71fee6](https://github.com/t-hamano/mark-bricks/commit/c71fee68536d4974c3dc2011114326f2fe0949cc))
- **tauri:** use design system tokens and button in the slide preview ([#160](https://github.com/t-hamano/mark-bricks/issues/160)) ([1cc6d1d](https://github.com/t-hamano/mark-bricks/commit/1cc6d1d6920149576e01dfaaa6867e7c5426a600))

# [0.15.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.14.1...tauri-v0.15.0) (2026-09-29)

### Bug Fixes

- **tauri:** prefer gutenberg translations for strings shared with the editor ([b4305d2](https://github.com/t-hamano/mark-bricks/commit/b4305d299e35e92df929b82058304f9a8048888a))
- **tauri:** reopen the open files after an update ([#128](https://github.com/t-hamano/mark-bricks/issues/128)) ([d4fa208](https://github.com/t-hamano/mark-bricks/commit/d4fa208aca3f4488bae2ed0d7de7aee4815f9b8e))
- **vscode:** load the katex fonts in the block canvas ([#136](https://github.com/t-hamano/mark-bricks/issues/136)) ([7687c94](https://github.com/t-hamano/mark-bricks/commit/7687c945d76d468438ab4603d18bc9b0be44e2a9))

### Features

- **editor:** add translations for the vscode display languages ([#126](https://github.com/t-hamano/mark-bricks/issues/126)) ([a9f3b92](https://github.com/t-hamano/mark-bricks/commit/a9f3b9212b90f7f58177a9e936b962ca6c684acc))
- **editor:** preview math code blocks ([#131](https://github.com/t-hamano/mark-bricks/issues/131)) ([56eaa90](https://github.com/t-hamano/mark-bricks/commit/56eaa90ba5d3d77f0dfee3cdf96054b2bb326d2d))
- **repo:** drop hungarian support, which has no gutenberg language pack ([e305724](https://github.com/t-hamano/mark-bricks/commit/e305724d6f2c5f2ecc01c89ed27338a063461b3d))
- **tauri:** add translations for the vscode display languages ([#124](https://github.com/t-hamano/mark-bricks/issues/124)) ([20a0257](https://github.com/t-hamano/mark-bricks/commit/20a0257e92ec7615251c0360e9e2fc2176f05ae2))

## [0.14.1](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.14.0...tauri-v0.14.1) (2026-09-27)

### Features

- **tauri:** add macos code signing and notarization ([ebbb269](https://github.com/t-hamano/mark-bricks/commit/ebbb2696f50ba9c020d2272040db11e807606557))

# [0.14.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.13.0...tauri-v0.14.0) (2026-09-27)

### Bug Fixes

- **editor:** display inline images with local paths ([#101](https://github.com/t-hamano/mark-bricks/issues/101)) ([d0fe235](https://github.com/t-hamano/mark-bricks/commit/d0fe2358fd623d823d40eeadc5c36296ced7944f))
- **editor:** restrict summary html to supported inline formats ([#116](https://github.com/t-hamano/mark-bricks/issues/116)) ([1c3b254](https://github.com/t-hamano/mark-bricks/commit/1c3b254b0d3c658d91db2c15247791ad38e88b0b))
- **repo:** update dependencies to address security advisories ([c635414](https://github.com/t-hamano/mark-bricks/commit/c6354144dd5f79257aa8035bebdb57dde22bfdb2))
- share image path parsing between the vs code and tauri apps ([#114](https://github.com/t-hamano/mark-bricks/issues/114)) ([896e0ee](https://github.com/t-hamano/mark-bricks/commit/896e0ee319d2ffaf66c17b2415ddf4de25b256c8))
- **tauri:** block untrusted inline scripts with csp ([d0884fd](https://github.com/t-hamano/mark-bricks/commit/d0884fd24788a762e23073c961303e4c99c6f815))
- **tauri:** resolve relative image paths against the document folder ([#112](https://github.com/t-hamano/mark-bricks/issues/112)) ([f9f0b73](https://github.com/t-hamano/mark-bricks/commit/f9f0b73025f4026c1126fe6c9970f7c8be36a9d0))
- **tauri:** restrict document access to native file selections ([#117](https://github.com/t-hamano/mark-bricks/issues/117)) ([3c09171](https://github.com/t-hamano/mark-bricks/commit/3c09171ae8ad883a25beaafc11d81be1da499661))

### Features

- **editor:** add a callback prop that fires once the canvas shows a block ([#110](https://github.com/t-hamano/mark-bricks/issues/110)) ([01dc4c6](https://github.com/t-hamano/mark-bricks/commit/01dc4c68d6d5ae9773abd2ddcb6d54152fc410ea))
- **editor:** add a toolbar button to insert and edit inline images ([#100](https://github.com/t-hamano/mark-bricks/issues/100)) ([9dd7a67](https://github.com/t-hamano/mark-bricks/commit/9dd7a67908bac41e5097c7da2c33b3ebe8bade73))
- **editor:** add yaml front matter editor ([#91](https://github.com/t-hamano/mark-bricks/issues/91)) ([25d6836](https://github.com/t-hamano/mark-bricks/commit/25d6836b18514078ddcc99c41ebb88e77e386d79))
- **editor:** let the host warn about image paths it cannot display ([#103](https://github.com/t-hamano/mark-bricks/issues/103)) ([729effa](https://github.com/t-hamano/mark-bricks/commit/729effaebdfe3ba3c7051f2ff24198c6207f69fd))
- **editor:** streamline the image block placeholder and toolbar ([30bde78](https://github.com/t-hamano/mark-bricks/commit/30bde78ae1a9b72f9e78191229df2b72ac7a483e))
- **editor:** support inline and linked images ([#96](https://github.com/t-hamano/mark-bricks/issues/96)) ([6560e2e](https://github.com/t-hamano/mark-bricks/commit/6560e2eac82025f282576018012bc8c6b7de8304))
- **vscode:** add options menu with yaml front matter toggle ([#92](https://github.com/t-hamano/mark-bricks/issues/92)) ([a03a261](https://github.com/t-hamano/mark-bricks/commit/a03a2610344e8affb4150bb769096dfbbc4a7caa))

# [0.13.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.12.0...tauri-v0.13.0) (2026-09-24)

### Bug Fixes

- **editor:** use surface background for list view focus ring gap ([7ac9658](https://github.com/t-hamano/mark-bricks/commit/7ac9658f608ae5e9b5d03e70acec25664aed1148))
- **tauri:** keep light-dark() unlowered in production css ([448302a](https://github.com/t-hamano/mark-bricks/commit/448302a496e24b88b867aeb953ae475b5312ef14))
- **tauri:** remove blanket focus outline suppression ([4dcdb1f](https://github.com/t-hamano/mark-bricks/commit/4dcdb1ff1ea922cfd7710b25d1baa2a4e7144d64))

### Features

- **editor:** derive code editor theme from system preference ([#81](https://github.com/t-hamano/mark-bricks/issues/81)) ([abd10e9](https://github.com/t-hamano/mark-bricks/commit/abd10e9972bfc9d4334d2da203ef6f95aed3d3ae))
- **editor:** support dark mode ([#80](https://github.com/t-hamano/mark-bricks/issues/80)) ([a349657](https://github.com/t-hamano/mark-bricks/commit/a34965708120138828b25ae2a15709c62cf5abcf))
- **tauri:** add color theme setting to visual editor preferences ([#88](https://github.com/t-hamano/mark-bricks/issues/88)) ([4aaf8db](https://github.com/t-hamano/mark-bricks/commit/4aaf8db98426c057bd8358243ebd1751b4934b4d))
- **tauri:** serve the updater manifest from the main branch ([a0ff3e1](https://github.com/t-hamano/mark-bricks/commit/a0ff3e12dc948c737bf6ce3fb20dfcb03a40cf57))
- **vscode:** add initial vscode extension ([#78](https://github.com/t-hamano/mark-bricks/issues/78)) ([f51cbf3](https://github.com/t-hamano/mark-bricks/commit/f51cbf39a2e4ebd5f3165a157b345fd286aedd44))

### BREAKING CHANGES

- **tauri:** the updater endpoint moved from
  releases/latest/download/latest.json to
  raw.githubusercontent.com/t-hamano/mark-bricks/main/apps/tauri/latest.json.
  Versions up to 0.12.0 still read releases/latest and stop finding
  updates once it points at a non-desktop release.

# [0.12.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.11.0...tauri-v0.12.0) (2026-08-29)

### Bug Fixes

- **editor:** do not write markdown back over an external content change ([39df035](https://github.com/t-hamano/mark-bricks/commit/39df035e45c02edf3911b676831b9b1730fd9a98))
- **editor:** flush debounced markdown before saves and close checks ([8df9e1f](https://github.com/t-hamano/mark-bricks/commit/8df9e1f8babb23e4e1f1bcd9547d6a4d1a409a86))
- **editor:** register the canvas iframe with the wp style runtime ([d220dd9](https://github.com/t-hamano/mark-bricks/commit/d220dd9024bd314c09a4c8aea20daa508805fe2f))

### Features

- **editor:** add a setting to hide the undo and redo buttons ([d70ef9b](https://github.com/t-hamano/mark-bricks/commit/d70ef9b2896f09960f7f938b7c66fa97c3b53dfb))
- **editor:** move the code editor toggle into the header behind a setting ([7678097](https://github.com/t-hamano/mark-bricks/commit/7678097c5021aa641a61dd02242cc6d934849a86))

### Performance Improvements

- **editor:** load the text editor lazily to keep monaco out of the entry chunk ([6089884](https://github.com/t-hamano/mark-bricks/commit/6089884da04ad3ef36e52ce3e6be87dfa7589618))

# [0.11.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.10.0...tauri-v0.11.0) (2026-08-29)

### Bug Fixes

- **editor:** center the parent selector dot in the taller header toolbar ([eb111b0](https://github.com/t-hamano/mark-bricks/commit/eb111b0d256f29f52c5e7bf768479ca5fa741d4a))
- **editor:** restore the list view expander width so nested blocks stay indented ([1798376](https://github.com/t-hamano/mark-bricks/commit/1798376d623c12708dd96cce2711faabf56d50ce))
- **tauri:** keep the system default label on the font family trigger ([5419cd6](https://github.com/t-hamano/mark-bricks/commit/5419cd69ad4f6f77ce5c9bc234ae095d2baf8a15))

### Features

- **editor:** add a block breadcrumb bar so nested selections are navigable ([d048338](https://github.com/t-hamano/mark-bricks/commit/d048338a0782763fcd44453646b11b4e2d09f18c))
- **editor:** map details elements to the core details block ([#50](https://github.com/t-hamano/mark-bricks/issues/50)) ([51932e3](https://github.com/t-hamano/mark-bricks/commit/51932e329065b1e465ada9b9bf5afeb4d412b6e4))
- **editor:** preserve emphasis and strong marker variations ([#52](https://github.com/t-hamano/mark-bricks/issues/52)) ([37ae2d5](https://github.com/t-hamano/mark-bricks/commit/37ae2d52a76c77fa85a9399cef47783a3ecfd275))
- **editor:** preserve the spaces after a list marker ([#51](https://github.com/t-hamano/mark-bricks/issues/51)) ([a87ac66](https://github.com/t-hamano/mark-bricks/commit/a87ac66a8c73ea34f1763ab49ad5edee78459985))
- **editor:** preserve the syntax each link was written in ([#53](https://github.com/t-hamano/mark-bricks/issues/53)) ([66ad139](https://github.com/t-hamano/mark-bricks/commit/66ad13919e63398a7b2cedea95b74b2278baf246))
- **editor:** render mermaid code blocks as diagrams ([#58](https://github.com/t-hamano/mark-bricks/issues/58)) ([c7ff279](https://github.com/t-hamano/mark-bricks/commit/c7ff279d8edc95a9efe241daf403f7d4570f7828))
- **editor:** rework the link popover around the shared link control ([#57](https://github.com/t-hamano/mark-bricks/issues/57)) ([b6c2d14](https://github.com/t-hamano/mark-bricks/commit/b6c2d14b0df6a11bfb800d7752b6c8895069dcc4))

# [0.10.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.9.1...tauri-v0.10.0) (2026-08-26)

### Bug Fixes

- **editor:** show sidebar close button tooltips below the button ([3b29f61](https://github.com/t-hamano/mark-bricks/commit/3b29f611ec170b2f2bac2df8c6dd099d55a9dd21))
- **tauri:** dedupe duplicated [@wordpress](https://github.com/wordpress) packages to register stores once ([b9b5411](https://github.com/t-hamano/mark-bricks/commit/b9b541191bcc0804ef5a9e2368169f0ca0129b81))
- **tauri:** make preferences tab panels non-focusable ([d1d53bd](https://github.com/t-hamano/mark-bricks/commit/d1d53bd94fc02a2092729cac97e7608cd0925d74))
- **tauri:** make preferences tab panels non-focusable ([dd9c503](https://github.com/t-hamano/mark-bricks/commit/dd9c503ee112636c676ed12e71b0881ef19689ac))
- **tauri:** stretch preferences modal panels to a fixed max width ([206293e](https://github.com/t-hamano/mark-bricks/commit/206293e82ece489c6237caa06e4a1067a0a050c7))

### Features

- **editor:** make the inserter block list arrow key navigable ([a16babf](https://github.com/t-hamano/mark-bricks/commit/a16babf5bbea4bc1a804e24e7ea1e868e174ed2e))

### Reverts

- **tauri:** make preferences tab panels non-focusable ([a615cb2](https://github.com/t-hamano/mark-bricks/commit/a615cb286d020f31d34d6ca205117be289ca8e2b))

## [0.9.1](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.9.0...tauri-v0.9.1) (2026-07-04)

### Bug Fixes

- **tauri:** allow blob editor iframe under csp on webkit ([cda7367](https://github.com/t-hamano/mark-bricks/commit/cda73671091c2c79886a12d836558eeee9b5b3f9))
- **tauri:** drop redundant node_modules stylesheet links ([368f120](https://github.com/t-hamano/mark-bricks/commit/368f1203c4140362fd2882b0a8317bfc1f769365))
- **tauri:** open report-issue link in the system browser ([2d648c0](https://github.com/t-hamano/mark-bricks/commit/2d648c0ecd568c6b42280fe6b8cb0dfa4ea5596f))

# [0.9.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.8.0...tauri-v0.9.0) (2026-05-23)

### Features

- **editor:** style inline code in the canvas ([8472aed](https://github.com/t-hamano/mark-bricks/commit/8472aed7c0561db7f359ac604ac5821f2d8c4c5f))

# [0.8.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.7.0...tauri-v0.8.0) (2026-05-23)

### Features

- **tauri:** replace lone blank tab when opening a file ([9908753](https://github.com/t-hamano/mark-bricks/commit/990875321e90189344ff01c5ccb9b4dc2d1bd317))

# [0.7.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.6.0...tauri-v0.7.0) (2026-05-23)

### Bug Fixes

- **editor:** localize heading block variations ([85e9b3a](https://github.com/t-hamano/mark-bricks/commit/85e9b3af91887d3de56f5e127db5702903e6f3d0))
- **tauri:** allow blob: in frame-src so the editor iframe loads ([34d4d2e](https://github.com/t-hamano/mark-bricks/commit/34d4d2ec33535c3eb6d80adbd0f4fa2597b1e4be))
- **tauri:** open os-associated markdown files by hardcoding extensions ([3528055](https://github.com/t-hamano/mark-bricks/commit/3528055f34e97a2d436a1115ad4ea73c0361e489))
- **tauri:** relax script-src csp so editor iframe bootstraps correctly ([23fc8ec](https://github.com/t-hamano/mark-bricks/commit/23fc8ec276329188581d142b4bdf0fb8483b6ba4))

### Features

- **editor:** drop block style variations ([8ccf2f9](https://github.com/t-hamano/mark-bricks/commit/8ccf2f9af7792d383d8af29b9e6182a29f7392ae))

## [0.6.1](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.6.0...tauri-v0.6.1) (2026-05-23)

### Bug Fixes

- **tauri:** allow blob: in frame-src so the editor iframe loads ([34d4d2e](https://github.com/t-hamano/mark-bricks/commit/34d4d2ec33535c3eb6d80adbd0f4fa2597b1e4be))
- **tauri:** open os-associated markdown files by hardcoding extensions ([3528055](https://github.com/t-hamano/mark-bricks/commit/3528055f34e97a2d436a1115ad4ea73c0361e489))

# [0.6.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.5.1...tauri-v0.6.0) (2026-05-23)

### Bug Fixes

- **tauri:** restrict asset protocol scope to image files ([#28](https://github.com/t-hamano/mark-bricks/issues/28)) ([1e0757e](https://github.com/t-hamano/mark-bricks/commit/1e0757e2096e6a62c8970068d434051b9ba91cec))

### Features

- **tauri:** adopt new cube app icon ([#27](https://github.com/t-hamano/mark-bricks/issues/27)) ([ef2ba6f](https://github.com/t-hamano/mark-bricks/commit/ef2ba6fdd26d13939ba3cbd5b005b4b19e58c4b7))
- **tauri:** enable strict content security policy ([ea5f00f](https://github.com/t-hamano/mark-bricks/commit/ea5f00f6a03a5f445f56ad1e0a0f910b1f2c29d6))

## [0.5.1](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.5.0...tauri-v0.5.1) (2026-05-22)

# [0.5.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.4.0...tauri-v0.5.0) (2026-05-22)

### Bug Fixes

- **repo:** align ja translations with gutenberg wording ([#19](https://github.com/t-hamano/mark-bricks/issues/19)) ([47cd076](https://github.com/t-hamano/mark-bricks/commit/47cd0764a601fece7729760ec3be1786b65a8eb1))
- **tauri:** localize preference selects and unify ja shortcut tone ([#22](https://github.com/t-hamano/mark-bricks/issues/22)) ([144196e](https://github.com/t-hamano/mark-bricks/commit/144196e08d294f89c974a3bbb0594308039e86b9))
- **tauri:** remove window file drop to restore editor block dragging ([abe74ca](https://github.com/t-hamano/mark-bricks/commit/abe74cadffef3140e89a045709b3967358879285))
- **tauri:** source report-issue link from package.json bugs url ([#17](https://github.com/t-hamano/mark-bricks/issues/17)) ([f13297e](https://github.com/t-hamano/mark-bricks/commit/f13297e609a0565dd8a734679f600a3c7127867b))

### Features

- **repo:** gitignore built i18n dictionaries and cache gutenberg translations ([#23](https://github.com/t-hamano/mark-bricks/issues/23)) ([1b6ce50](https://github.com/t-hamano/mark-bricks/commit/1b6ce500331674bb12d62c0b19db3a2a1c2c150d))
- **repo:** localize the tauri app and add shared i18n tooling ([#16](https://github.com/t-hamano/mark-bricks/issues/16)) ([62b66f1](https://github.com/t-hamano/mark-bricks/commit/62b66f1335884c82c3babe2c8671b923adf57d44))
- **tauri:** add check-for-updates button to about modal ([#20](https://github.com/t-hamano/mark-bricks/issues/20)) ([ff202ec](https://github.com/t-hamano/mark-bricks/commit/ff202ec843b5234ea33597f2c090084a1f67d886))
- **tauri:** group preferences panels into labeled sections ([#21](https://github.com/t-hamano/mark-bricks/issues/21)) ([51ad252](https://github.com/t-hamano/mark-bricks/commit/51ad252461460bb3b078a9159548ec2834c7a90c))
- **tauri:** show current version in up-to-date dialog ([#18](https://github.com/t-hamano/mark-bricks/issues/18)) ([adac979](https://github.com/t-hamano/mark-bricks/commit/adac979d41c452e29ff645bde6a13b6e1c0ea4bb))

# [0.4.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.3.0...tauri-v0.4.0) (2026-05-22)

### Bug Fixes

- **editor:** keep freshly opened file from being marked dirty ([73154ea](https://github.com/t-hamano/mark-bricks/commit/73154ea14009241704c443f6165b01c355863873))
- **tauri:** use compact button size for update check in preferences ([361cd7d](https://github.com/t-hamano/mark-bricks/commit/361cd7dcca0fdc6b263c76e4b595aa4e8091039d))

### Features

- **tauri:** associate markdown files with the app ([#6](https://github.com/t-hamano/mark-bricks/issues/6)) ([4eac9f9](https://github.com/t-hamano/mark-bricks/commit/4eac9f9876c41fcc2c2294a422f874793881bfa2))
- **tauri:** open dropped markdown files via drop zone ([#9](https://github.com/t-hamano/mark-bricks/issues/9)) ([9965344](https://github.com/t-hamano/mark-bricks/commit/99653443ce8982259d90c867de6d4a492ee40987))

# [0.3.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.2.0...tauri-v0.3.0) (2026-05-20)

### Features

- **tauri:** add github-based auto updater ([3daed7e](https://github.com/t-hamano/mark-bricks/commit/3daed7e430feec9b0f6c1b5d942fe25c9432917d))

# [0.2.0](https://github.com/t-hamano/mark-bricks/compare/tauri-v0.1.0...tauri-v0.2.0) (2026-05-20)

### Bug Fixes

- **repo:** handle release commit and tag in app bump scripts ([ae712b7](https://github.com/t-hamano/mark-bricks/commit/ae712b79d80c410dc462b30d413f25473a86c0d8))

# 0.1.0 (2026-05-20)

### Bug Fixes

- **tauri:** read crate name from cargo.toml and tolerate already-synced files in bump-version script ([18ba639](https://github.com/t-hamano/mark-bricks/commit/18ba639c4946f27794ab58c8387c2ed46df66750))
