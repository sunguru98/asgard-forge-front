import { createCanvas } from 'canvas';
import { UserNFT } from '../types';

const BASE_LAYER_URL = `https://asgardforge.b-cdn.net/layers`;
const WEAPON_LAYER_URL = `https://asgardforge.b-cdn.net/weapons`;

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1080;

export const drawFusedImage = async (
  soldierNFT: UserNFT,
  weaponNFT: UserNFT
) => {
  const CANVAS = createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
  const CANVAS_CTX = CANVAS.getContext('2d');
  CANVAS_CTX.imageSmoothingEnabled = true;
  CANVAS_CTX.globalAlpha = 1;
  CANVAS_CTX.globalCompositeOperation = 'source-over';
  CANVAS_CTX.clearRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  const { attributes } = soldierNFT.metadata.arweaveMetadata;

  const images = await Promise.all(
    attributes.map(
      ({ trait_type, value }: { trait_type: string; value: string }) => {
        return loadImage(
          trait_type !== 'Weapon'
            ? `${BASE_LAYER_URL}/${trait_type}/${value.replace(/ /g, '_')}.png`
            : `${WEAPON_LAYER_URL}/${weaponNFT.metadata.arweaveMetadata.attributes[0].value.replace(
                / /g,
                '_'
              )}.png`
        );
      }
    )
  );

  images.forEach((image) =>
    CANVAS_CTX.drawImage(image, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT)
  );

  return CANVAS.toDataURL();
};

function loadImage(src: string) {
  return new Promise((res) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = function () {
      res(image);
    };
    image.src = src;
  });
}
