// Renders public/favicon.svg to the PNG icons the manifest and iOS need.
// The loaf sits inside the central 80% of the square, so the 512 icon also works as a maskable icon.
import sharp from 'sharp';

for (const size of [180, 192, 512]) {
    await sharp('public/favicon.svg', { density: 384 }).resize(size, size).png().toFile(`public/icon-${size}.png`);
}
console.log('icons written');
