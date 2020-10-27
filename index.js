#!/usr/bin/env node
"use strict"

const webfont = require('webfont').default;
const globby = require('globby');
const sass = require('sass');
const fs = require('fs');
const os = require('os')
const path = require('path');
const crypto = require('crypto')

const mdiSvgPath = path.dirname(require.resolve('@mdi/svg/package.json'));
const tmpdir = path.join(os.tmpdir(), 'mdi-font-build');

function makeDirs(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(tmpdir)) {
    fs.mkdirSync(tmpdir, { recursive: true });
  }
}

function generateSCSS({
  fileName,
  fontName,
  fontWeight,
  version,
  iconNames
}) {
  // {fileName}.scss
  const main = path.resolve(__dirname, 'scss', 'main.scss');
  const mainDist = path.resolve(tmpdir, `${fileName}.scss`);
  const mainString = fs.readFileSync(main, 'utf8');
  fs.writeFileSync(mainDist, mainString);
  // Others
  const others = [
    'animated',
    'core',
    'extras',
    'functions',
    'icons',
    'path',
    'variables'
  ];
  others.forEach(file => {
    const other = path.resolve(__dirname, 'scss', `_${file}.scss`);
    const otherDist = path.resolve(tmpdir, `_${file}.scss`);
    let otherString = fs.readFileSync(other, 'utf8')
      .replace(/prefix/g, 'mdi')
      .replace(/mdi-css-mdi/g, 'mdi-css-prefix')
      .replace(/fileName/g, fileName)
      .replace(/fontFamily/g, fileName)
      .replace(/fontName/g, fontName)
      .replace(/fontWeight/g, fontWeight)
      .replace(/-.-.-/g, version);
    if (file === 'variables') {
      const iconMappings = iconNames.map((icon, i) => (
        // The default start codepoint of itgalaxy/webfont is EA01
        `  "${icon}": ${(0xEA01 + i).toString(16)}`
      ))
      otherString = otherString.replace(/icons: \(\)/, `icons: (\n${iconMappings.join(',\n')}\n)`);
    }
    fs.writeFileSync(otherDist, otherString);
  });
}

function renderCSS({ fileName, outputDir }, minimized) {
  sass.render({
    file: path.resolve(tmpdir, `${fileName}.scss`),
    outputStyle: minimized ? 'compressed' : 'expanded',
    outFile: `${fileName}.css`
  }, function (err, result) {
    if (err) {
      console.error(err);
      throw (err);
    } else {
      fs.writeFileSync(
        path.join(outputDir, fileName + (minimized ? '.min.css' : '.css')),
        result.css
      );
    }
  });
}

function generateCSS(config) {
  renderCSS(config, false);
  renderCSS(config, true);
}

const mapSvg = (icon) =>
  path.join(mdiSvgPath, 'svg', icon + '.svg');

const mapShortName = fileName =>
  path.parse(fileName).name

function genWebfont(iconNames, extraIcons, outputDir) {
  // Allow passing strings
  iconNames = [].concat(iconNames);
  let svgs = iconNames.map(mapSvg);
  if (extraIcons) {
    svgs = svgs.concat(extraIcons);
    extraIcons = globby.sync(extraIcons);
    if (!extraIcons.length)
      throw new Error('No matches found for extraIcons.')
    const extraIconNames = extraIcons.map(mapShortName);
    iconNames = iconNames.concat(extraIconNames);
  }
  const version = crypto.randomBytes(16).toString('hex');

  const config = {
    iconNames,
    outputDir,
    files: svgs,
    startUnicode: 0xEA01,  // Start codepoint
    // github.com/itgalaxy/webfont/blob/v9.0.0/src/standalone.js#L86
    sort: false,  // Prevent glyphsData sorting and breaking the order
    fontName: 'Material Design Icons',
    fileName: 'materialdesignicons',
    version,
    formats: ['ttf', 'eot', 'woff', 'woff2'],
    fontHeight: 512,
    descent: 64,
    normalize: true
  }
  webfont(config)
    .then(result => {
      makeDirs(outputDir);
      for (let format of ['ttf', 'eot', 'woff', 'woff2']) {
        fs.writeFileSync(
          path.join(outputDir, 'materialdesignicons.' + format),
          result[format]
        );
      }
      generateSCSS(config);
      generateCSS(config);
      return result;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

if (require.main === module) {
  const yargs = require('yargs');
  const { hideBin } = require('yargs/helpers');
  const argv = yargs(hideBin(process.argv))
    // github.com/yargs/yargs/blob/v16.1.0/docs/advanced.md#default-commands
    .command(['<icons...>', '*'], 'Names of icons to include')
    .option('extra', {
      alias: 'e',
      type: 'array',
      describe: 'Extra icons (SVG files) to include'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      default: './mdi',
      describe: 'Output directory'
    })
    .argv;
  // console.log(argv)
  genWebfont(argv._, argv.extra, argv.output);
}

module.exports = genWebfont;
