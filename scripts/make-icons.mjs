// Renders public/favicon.svg to the PNG icons the manifest and iOS need.
import sharp from 'sharp';

for (const size of [192, 512]) {
    await sharp('public/favicon.svg').resize(size, size).png().toFile(`public/icon-${size}.png`);
}
console.log('icons written');
