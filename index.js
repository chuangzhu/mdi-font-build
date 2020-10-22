#!/usr/bin/env node

// const yargs = require('yargs');
const webfont = require("webfont").default;
const sass = require('sass');
const fs = require('fs');
const os = require('os')
const path = require('path');
const crypto = require('crypto')

const mdiSvgPath = path.dirname(require.resolve('@mdi/svg/package.json'));
const distFolder = './mdi';
  const tmpdir = path.join(os.tmpdir(), 'mdi-font-build');

function generateFolders() {
  if (!fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder, { recursive: true });
  }
  if (!fs.existsSync(tmpdir)) {
    fs.mkdirSync(tmpdir, { recursive: true });
  }
}

function generateSCSS(config, icons) {
  const {
    fileName,
    fontName,
    fontWeight,
    version,
  } = config;
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
      const iconMappings = icons.map((icon, i) => (
        `  "${icon}": F${(i + '').padStart(4, '0')}`
      ))
      otherString = otherString.replace(/icons: \(\)/, `icons: (\n${iconMappings.join(',\n')}\n)`);
    }
    fs.writeFileSync(otherDist, otherString);
  });
}

function generateCSS(config) {
  const { fileName } = config;
  sass.render({
    file: path.resolve(tmpdir, `${fileName}.scss`),
    outputStyle: 'expanded',
    outFile: `${fileName}.css`
  }, function (err, result) {
    if (err) {
      console.error(err);
    } else {
      fs.writeFileSync(path.join(distFolder, `${fileName}.css`), result.css);
    }
  });
  sass.render({
    file: path.resolve(tmpdir, `${fileName}.scss`),
    outputStyle: 'compressed',
    outFile: `${fileName}.css`
  }, function (err, result) {
    if (err) {
      console.error(err);
    } else {
      fs.writeFileSync(path.join(distFolder, `${fileName}.min.css`), result.css);
    }
  });
}

const mapSvg = (icon) =>
  path.join(mdiSvgPath, 'svg', icon + '.svg');

function genWebfont(icons) {
  let svgs = icons.map(mapSvg);
  const version = crypto.randomBytes(16).toString('hex');

  webfont({
    files: svgs,
    fontName: 'Material Design Icons',
    fileName: 'materialdesignicons',
    version,
    formats: ['ttf', 'eot', 'woff', 'woff2'],
    fontHeight: 512,
    descent: 64,
    normalize: true
  })
    .then(result => {
      generateFolders();
      fs.writeFileSync(path.join(distFolder, `materialdesignicons.ttf`), result.ttf);
      fs.writeFileSync(path.join(distFolder, `materialdesignicons.eot`), result.eot);
      fs.writeFileSync(path.join(distFolder, `materialdesignicons.woff`), result.woff);
      fs.writeFileSync(path.join(distFolder, `materialdesignicons.woff2`), result.woff2);
      generateSCSS(result.config, icons);
      generateCSS(result.config);
      return result;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

if (require.main === module) {
  genWebfont(process.argv.slice(2))
}
