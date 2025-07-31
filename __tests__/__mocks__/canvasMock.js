// Mock canvas module for Jest tests
export function createCanvas(width, height) {
  return {
    width,
    height,
    getContext: () => ({
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ 
        data: new Uint8ClampedArray(width * height * 4).fill(255) 
      }))
    })
  };
}

export function loadImage() {
  return Promise.resolve({
    width: 100,
    height: 100
  });
}

export default {
  createCanvas,
  loadImage
};
