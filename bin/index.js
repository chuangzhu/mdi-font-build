#!/usr/bin/env node

// const yargs = require('yargs');
const webfont = require("webfont").default;
const sass = require('sass');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto')

const mdiSvgPath = path.dirname(require.resolve('@mdi/svg/package.json'));
const distFolder = './mdi';

function generateFolders() {
  if (!fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder, { recursive: true });
  }
  const folders = ['scss', 'css', 'fonts'];
  folders.forEach(folder => {
    if (!fs.existsSync(path.join(distFolder, folder))) {
      fs.mkdirSync(path.join(distFolder, folder));
    }
  });
  console.log('- Folders created.');
}

function generateSCSS(config, icons) {
  const {
    fileName,
    fontName,
    fontFamily,
    fontWeight,
    version,
  } = config;
  // {fileName}.scss
  const main = path.resolve(__dirname, '..', 'src', 'scss', 'main.scss');
  const mainDist = path.resolve(distFolder, 'scss', `${fileName}.scss`);
  const mainString = fs.readFileSync(main, 'utf8');
  fs.writeFileSync(mainDist, mainString);
  console.log(`- Generated ${fileName}.scss`);
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
    const other = path.resolve(__dirname, '..', 'src', 'scss', `_${file}.scss`);
    const otherDist = path.resolve(distFolder, 'scss', `_${file}.scss`);
    let otherString = fs.readFileSync(other, 'utf8')
      .replace(/prefix/g, 'mdi')
      .replace(/fileName/g, fileName)
      .replace(/fontFamily/g, fileName)
      .replace(/fontName/g, fontName)
      .replace(/fontWeight/g, fontWeight)
      .replace(/-.-.-/g, version)
      .replace(/mdi-css-mdi/g, 'mdi-css-prefix');
    if (file === 'variables') {
      const iconMappings = icons.map((icon, i) => (
        `  "${icon}": F${(i+'').padStart(4, '0')}`
      ))
      otherString = otherString.replace(/icons: \(\)/, `icons: (\n${iconMappings.join(',\n')}\n)`);
    }
    fs.writeFileSync(otherDist, otherString);
  });
}

function generateCSS(config) {
  const { fileName } = config;
  sass.render({
    file: path.resolve(distFolder, 'scss', `${fileName}.scss`),
    outputStyle: 'expanded',
    outFile: `${fileName}.css`
  }, function (err, result) {
    if (err) {
      console.error(err);
    } else {
      fs.writeFileSync(path.join(distFolder, 'css', `${fileName}.css`), result.css);
    }
  });
  sass.render({
    file: path.resolve(distFolder, 'scss', `${fileName}.scss`),
    outputStyle: 'compressed',
    outFile: `${fileName}.css`
  }, function (err, result) {
    if (err) {
      console.error(err);
    } else {
      fs.writeFileSync(path.join(distFolder, 'css', `${fileName}.min.css`), result.css);
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
      fs.writeFileSync(path.join(distFolder, 'fonts', `materialdesignicons.ttf`), result.ttf);
      fs.writeFileSync(path.join(distFolder, 'fonts', `materialdesignicons.eot`), result.eot);
      fs.writeFileSync(path.join(distFolder, 'fonts', `materialdesignicons.woff`), result.woff);
      fs.writeFileSync(path.join(distFolder, 'fonts', `materialdesignicons.woff2`), result.woff2);
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
