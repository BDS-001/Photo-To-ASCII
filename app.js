document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const imgWidthInput = document.getElementById('imageWidth');
    const imgHeightInput = document.getElementById('imageHeight');
    const maintainAspectRatioInput = document.getElementById('maintainAspectRatio')

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const asciiDisplay = document.getElementById('art');
    const imageSettings = document.getElementById('imageSettings');

    let imgWidth = 150
    let imgHeight = 150
    let aspectRatio
    let contrastFactor = 1
    let reverseIntensity = false
    let maintainAspectRatio = false
    
    imageSettings.addEventListener('change', (event) => {
        if (event.target.name === 'imageWidth') handleImgDimensions(event.target.name, parseInt(event.target.value))
        if (event.target.name === 'imageHeight') handleImgDimensions(event.target.name, parseInt(event.target.value))
        if (event.target.name === 'contrastFactor') contrastFactor = parseFloat(event.target.value)
        if (event.target.name === 'reverseIntensity') reverseIntensity = event.target.checked
        if (event.target.name === 'maintainAspectRatio') handleImgDimensions(event.target.name, event.target.checked)
        processImage(imageUpload.files[0]);
    });
    
    function processImage(file) {
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const uploadedImg = e.target.result;
                const img = new Image();
                
                img.onload = () => {
                    aspectRatio = img.width / img.height;
                    imgHeight = maintainAspectRatio ? Math.floor((imgWidth / aspectRatio) / 2) : imgHeight;
                
                    canvas.width = imgWidth;
                    canvas.height = imgHeight;
                
                    context.drawImage(img, 0, 0, imgWidth, imgHeight);
                    let pixelData = context.getImageData(0, 0, imgWidth, imgHeight).data;
                    
                    displayArt(convertToASCII(applyContrast(convertToGreyscale(pixelData))));
                };
                img.src = uploadedImg;
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    function handleImgDimensions(name, value) {
        if (name === 'maintainAspectRatio') {
            maintainAspectRatio = value
            imgHeight = Math.floor((imgWidth / aspectRatio) / 2)
            imgHeightInput.value = imgHeight
            return
        }

        if (name === 'imageWidth') {
            imgWidth = value
            if (maintainAspectRatio) imgHeight = Math.floor((imgWidth / aspectRatio) / 2)
            imgHeightInput.value = imgHeight
            return
        }

        if (name === 'imageHeight') {
            imgHeight = value
            if (maintainAspectRatio) imgWidth = Math.floor((imgHeight * aspectRatio) * 2)
            imgWidthInput.value = imgWidth
            return
        }
    }

    function convertToGreyscale(pixelData) {
        const greyscaleData = new Uint8ClampedArray(pixelData.length/4);
        for (let i = 0; i < greyscaleData.length; i++) {
            const Red = pixelData[i * 4];
            const Green = pixelData[(i * 4) + 1];
            const Blue = pixelData[(i * 4) + 2];
    
            greyscaleData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue);
        }
        return greyscaleData;
    }
    
    function applyContrast(greyscaleData) {
        const contrastedData = new Uint8ClampedArray(greyscaleData.length);
        for (let i = 0; i < greyscaleData.length; i++) {
            const pixel = greyscaleData[i];
            contrastedData[i] = Math.floor(((pixel / 255 - 0.5) * contrastFactor + 0.5) * 255);
        }
        return contrastedData;
    }
    
    function convertToASCII(greyscaleData) {
        const asciiIntensity = reverseIntensity ? 
            'Ñ@#W$9876543210?!abc;:+=-,._ ' :
            ' _.,-=+:;cba!?0123456789$W#@Ñ';
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
        asciiDisplay.innerHTML = `<pre>${artData}</pre>`;
    }
});