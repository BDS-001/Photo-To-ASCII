document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload')
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const asciiDisplay = document.getElementById('art')
    let imgWidth = 300;

    imageUpload.addEventListener('change', (event) => {
      processImage(event.target.files[0])
    });

    function processImage(file) {
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const uploadedImg = e.target.result;
                const img = new Image();
                
                img.onload = () => {
                const aspectRatio = img.width / img.height;
                const imgHeight = (imgWidth / aspectRatio) / 1.6;
            
                canvas.width = imgWidth;
                canvas.height = imgHeight;
            
                context.drawImage(img, 0, 0, imgWidth, imgHeight);
                let pixelData = context.getImageData(0, 0, imgWidth, imgHeight).data;
                
                displayArt(convertToASCII(convertToGreyscale(pixelData)))
                };

                img.src = uploadedImg;
            };
            
            reader.readAsDataURL(file);
        }
    }

    function convertToGreyscale(pixelData) {
        const greyscaleData = new Uint8ClampedArray(pixelData.length/4);
        for (let i = 0; i < greyscaleData.length; i++) {
            const Red = pixelData[i * 4]
            const Green = pixelData[(i * 4) + 1]
            const Blue = pixelData[(i * 4) + 2]
    
            greyscaleData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue)
        }
        return greyscaleData
    }
    
    function convertToASCII(greyscaleData) {
        //[' ', '⣿', '⢿', '⠿', '⠟', '⣛', '⣩', '⣭', '⣶', '⣾', '⣷', '⣆', '⡇', '⠀', '⠁', '⠃', '⠈', '⠉', '⠋', '⠏'];
        //[' ', '.', ',', ':', ';', '-', '~', '=', '+', '*', '#', '%', '@']
        const asciiIntensity = [' ', '.', ',', ':', ';', '-', '~', '=', '+', '*', '#', '%', '@'];
        const artLines = [];
        const divider = Math.floor(255 / (asciiIntensity.length - 1));
    
        for (let i = 0; i < greyscaleData.length; i += imgWidth) {
            const line = [];
            for (let j = 0; j < imgWidth; j++) {
                const index = Math.min(Math.floor(greyscaleData[i + j] / divider), asciiIntensity.length - 1);
                line.push(asciiIntensity[index]);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }
    
    function displayArt(artData) {
        asciiDisplay.innerHTML = artData
    }
  });