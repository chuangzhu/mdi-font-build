# mdi-font-build

An (maybe) easier to use version of [Templarian/MaterialDesign-Font-Build](https://github.com/Templarian/MaterialDesign-Font-Build/).

```bash
npm i -g mdi-font-build
```

## CLI

```bash
mdi-font-build <iconNames...> -o <outputDirectory> [-e <extraIcons...>]
```

* `iconNames`: Icons to include, e.g. `bell account clock-outline`.
* `extraIcons`: SVG files to include besides the MDI collection.
* `outputDirectory`: Directory to output font and CSS files.

## Node

```javascript
const fontBuild = require('mdi-font-build')
fontBuild(iconNames, extraIcons, outputDirectory)
```

* `iconNames: Array<string>`
* `extraIcons: Array<string>`, shell globs are allowed.
* `outputDirectory: string`
