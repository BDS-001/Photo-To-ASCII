document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload')
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const asciiDisplay = document.getElementById('art')

    imageUpload.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const uploadedImg = e.target.result;
          const img = new Image();
          
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            const imgWidth = 100;
            const imgHeight = imgWidth / aspectRatio;
        
            canvas.width = imgWidth;
            canvas.height = imgHeight;
        
            context.drawImage(img, 0, 0, imgWidth, imgHeight);
            let pixelData = context.getImageData(0, 0, imgWidth, imgHeight).data;
            
            convertToGreyscale(pixelData)
          };
  
          img.src = uploadedImg;
        };
        
        reader.readAsDataURL(file);
      }
    });
  });

  function convertToGreyscale(pixelData) {
    const greyscaleData = new Uint8ClampedArray(pixelData.length/4);
    for (let i = 0; i < greyscaleData.length; i++) {
        const Red = pixelData[i * 4]
        const Green = pixelData[(i * 4) + 1]
        const Blue = pixelData[(i * 4) + 2]

        greyscaleData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue)
    }
    console.log(greyscaleData)
    return greyscaleData
}