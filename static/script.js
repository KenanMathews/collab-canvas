document.addEventListener('DOMContentLoaded', function () {
    const stage = new Konva.Stage({
        container: 'container',
        width: 400,
        height: 400
    });

    const drawingLayer = new Konva.Layer();
    stage.add(drawingLayer);

    const pixelSize = 10; // Size of each pixel
    const undoStack = []; // Stack to store drawing history for undo
    const redoStack = []; // Stack to store undone actions for redo

    // Initialize the grid with white pixels
    const rows = stage.height() / pixelSize;
    const cols = stage.width() / pixelSize;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            createPixel(j, i, 'white');
        }
    }

    let isDrawing = false;
    let lastDrawnPixel = null;

    // Event listener to change pixel color on click
    stage.on('mousedown touchstart', function (event) {
        if (event.evt.which === 1) { // Left mouse button
            isDrawing = true;
            drawPixel(event);
        } else if (event.evt.which === 3) { // Right mouse button
            fillTool(event);
        }
    });

    stage.on('mousemove touchmove', function (event) {
        if (isDrawing) {
            drawPixel(event);
        }
    });

    stage.on('mouseleave', function (event) {
        isDrawing = false;
    });

    stage.on('mouseup touchend', function () {
        isDrawing = false;
        lastDrawnPixel = null;
        addToUndoStack(); // Add current drawing state to undo stack after mouseup
        redoStack.length = 0; // Clear redo stack after new drawing action
    });

    // Event listener to handle undo/redo with keyboard shortcuts
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === 'z') { // Ctrl + Z for undo
            undo();
        } else if (event.ctrlKey && event.key === 'y') { // Ctrl + Y for redo
            redo();
        }
    });

    function drawPixel(event) {
        const pointer = stage.getPointerPosition();
        const gridX = Math.floor(pointer.x / pixelSize);
        const gridY = Math.floor(pointer.y / pixelSize);
        const color = document.getElementById('colorPicker').value;

        // Only draw if the pointer is within the canvas bounds
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            if (!lastDrawnPixel || lastDrawnPixel.x !== gridX || lastDrawnPixel.y !== gridY) {
                createPixel(gridX, gridY, color);
                lastDrawnPixel = { x: gridX, y: gridY };
            }
        }
    }
    

    function createPixel(x, y, color) {
        const rect = new Konva.Rect({
            x: x * pixelSize,
            y: y * pixelSize,
            width: pixelSize,
            height: pixelSize,
            fill: color,
            draggable: false
        });
        drawingLayer.add(rect);
        drawingLayer.batchDraw();
    }

    function fillTool(event) {
        const pointer = stage.getPointerPosition();
        const gridX = Math.floor(pointer.x / pixelSize);
        const gridY = Math.floor(pointer.y / pixelSize);

        const targetPixel = getPixelAt(gridX, gridY);

        if (targetPixel) {
            const targetColor = targetPixel.fill();
            floodFill(gridX, gridY, targetColor, document.getElementById('colorPicker').value);
            drawingLayer.batchDraw();
            addToUndoStack();
        }
    }

    function getPixelAt(x, y) {
        const pixels = drawingLayer.children.slice();

        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            if (pixel.x() === x * pixelSize && pixel.y() === y * pixelSize) {
                return pixel;
            }
        }
        return null;
    }

    function floodFill(x, y, targetColor, replacementColor) {
        const pixel = getPixelAt(x, y);

        if (!pixel) return;

        const currentColor = pixel.fill();

        if (currentColor !== targetColor || currentColor === replacementColor) return;

        pixel.fill(replacementColor);

        floodFill(x + 1, y, targetColor, replacementColor); // Right
        floodFill(x - 1, y, targetColor, replacementColor); // Left
        floodFill(x, y + 1, targetColor, replacementColor); // Down
        floodFill(x, y - 1, targetColor, replacementColor); // Up
    }

    function addToUndoStack() {
        const state = drawingLayer.clone();
        undoStack.push(state);
    }

    function undo() {
        if (undoStack.length > 0) {
            const prevState = undoStack.pop();
            redoStack.push(drawingLayer.clone()); // Push current state to redo stack
            drawingLayer.destroyChildren();
            drawingLayer.add(prevState.children);
            drawingLayer.batchDraw();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            undoStack.push(drawingLayer.clone()); // Push current state to undo stack
            drawingLayer.destroyChildren();
            drawingLayer.add(nextState.children);
            drawingLayer.batchDraw();
        }
    }
    
    function submitKonvaImage() {
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        // Convert Konva stage to image
        const content = stage.toDataURL({ mimeType: 'image/png' });

        const file = dataURLtoFile(content, 'image.png'); // Convert data URL to file object
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', document.getElementById("nameInput").value);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            submitButton.disabled = false;
            console.log('Success:', data);
            showPopup(data.image_link);
            resetEditor();
        })
        .catch(error => {
            submitButton.disabled = false;
            console.error('Error:', error);
        });
    }
    function resetEditor() {
        // Clear the drawing layer
        drawingLayer.destroyChildren();
    
        // Initialize the grid with white pixels again
        const rows = stage.height() / pixelSize;
        const cols = stage.width() / pixelSize;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                createPixel(j, i, 'white');
            }
        }
    
        // Clear undo and redo stacks
        undoStack.length = 0;
        redoStack.length = 0;
    
        // Batch draw to improve performance
        drawingLayer.batchDraw();
    }
    function dataURLtoFile(dataUrl, filename) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    const preview_stage = new Konva.Stage({
        container: 'preview-container',
        width: 1600,
        height: 1600
    });
    preview_stage.scaleX(0.5);
    preview_stage.scaleY(0.5);
    
    // Function to add images to group from a JSON array
    function addImagesFromJSON(jsonArray, stage) {
        var layer = new Konva.Layer();
        stage.add(layer);
    
        var group = new Konva.Group();
    
        jsonArray.forEach(function (jsonObj) {
            var imageObj = new Image();
            imageObj.onload = function () {
                var image = new Konva.Image({
                    x: jsonObj.x_coord,         // X coordinate from JSON object
                    y: jsonObj.y_coord,         // Y coordinate from JSON object
                    image: imageObj,
                    width: 400,           // Image width (modify as needed)
                    height: 400           // Image height (modify as needed)
                });
    
                // Add the image to the group
                group.add(image);
                layer.batchDraw(); // Draw the layer to see changes
            };
            imageObj.src = jsonObj.image_path; // Image URL from JSON object
        });
    
        // Add the group to the layer
        layer.add(group);
    }
        

    function loadPreviewImage(){
        fetchAnnotations()
        .then(data => {addImagesFromJSON(data,preview_stage)});
    }
    async function fetchAnnotations() {
        try {
            const response = await fetch('/annotations');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching annotations:', error);
            return [];
        }
    }
    function showPopup(url) {
        document.getElementById("popupUrl").innerText = url;
        document.getElementById("popupUrl").href = url;
        document.getElementById("popup").classList.remove("hidden");
    }
    function loadInfoInPage(){
        loadPreviewImage()
        // Usage:
        fetchAnnotations()
        .then(data => {
            const annotationsList = document.getElementById('annotations-list');
            data.forEach(annotation => {
                const imagePath = annotation.image_path.length > 100 ? annotation.image_path.substring(0, 100) + '...' : annotation.image_path;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="border px-4 py-2">${annotation.name}</td>
                    <td class="border px-4 py-2"><a href="${annotation.image_path}" class="truncate inline-block max-w-xs overflow-hidden text-blue-500 hover:text-blue-700 focus:text-blue-700">${imagePath}</td>
                    <td class="border px-4 py-2">${annotation.x_coord}</td>
                    <td class="border px-4 py-2">${annotation.y_coord}</td>
                `;
                annotationsList.appendChild(row);
            });
        });
    }
    loadInfoInPage();
    // Add event listener to the submit button
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', submitKonvaImage);
    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', resetEditor);
    document.querySelectorAll('.tab-btn').forEach(item => {
        item.addEventListener('click', event => {
            const tabContent = document.querySelectorAll('.tab-content');
            tabContent.forEach(content => {
                content.classList.add('hidden');
            });
            const selectedTab = document.getElementById(event.target.dataset.target);
            selectedTab.classList.remove('hidden');
        });
    });
    const demoModal = document.getElementById('demo-modal');
    const openDemoModalButton = document.getElementById('open-demo-modal-button');
    const closeDemoModalButton = document.getElementById('close-demo-modal-button');

    // Function to open the demo modal
    function openDemoModal() {
        demoModal.classList.remove('hidden');
    }

    // Function to close the demo modal
    function closeDemoModal() {
        demoModal.classList.add('hidden');
    }

    // Event listener to open the demo modal when help button is clicked
    openDemoModalButton.addEventListener('click', openDemoModal);

    // Event listener to close the demo modal when close button is clicked
    closeDemoModalButton.addEventListener('click', closeDemoModal);

    document.getElementById("generatePreviewButton").addEventListener("click", function() {
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        if(document.getElementById("promptInput").value.length == 0){
            alert("Fill in a prompt")
            return;
        }
        const prompt = document.getElementById("promptInput").value;
        const name = document.getElementById("nameInput").value
        // Call a function to load the prompt and generate/display the preview (implementation needed)
        loadPromptAndShowPreview(prompt,name);
        
        // Enable confirm upload button if there's a preview
        document.getElementById("confirmUploadButton").disabled = false;
        document.getElementById("download-btn").disabled = false;

    });
    


        // Function to download the generated image
        function downloadImage() {
            const imgSrc = document.getElementById("pixel-preview").src;
            const fileName = "pixel_art.png"; // You can customize the file name here

            // Create a temporary anchor element
            const a = document.createElement("a");
            a.href = imgSrc;
            a.download = fileName;

            // Append the anchor element to the body and trigger the download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    // Function to handle loading prompt and showing preview (implementation based on your backend logic)
    function loadPromptAndShowPreview(prompt,name) {
        fetch('/generate_pixel_art', {
            method: 'POST',
            body: JSON.stringify({ prompt: prompt, name, name }),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Pixel art generated successfully") {
                const previewElement = document.getElementById("preview-pixel-art");
                previewElement.classList.remove("hidden");
                // Create an image element
                const img = document.getElementById("pixel-preview");
                // Set the src attribute to the image preview URL
                img.src = data.image_link;
                const downloadBtn = document.getElementById("download-btn");
                downloadBtn.addEventListener("click", downloadImage);
            } else {
                alert("Image limit reached for the day")
                console.error("Error generating preview:", data.error);
                // Handle preview generation errors (optional)
            }
            loadInfoInPage();
        });
    }
    
    document.getElementById("confirmUploadButton").addEventListener("click", function() {
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        uploadDataToServer();
        // Clear preview and disable button after upload
        document.getElementById("preview-pixel-art").classList.add("hidden");
        document.getElementById("confirmUploadButton").disabled = true;
    });
    
    function uploadDataToServer() {
        const name = document.getElementById("nameInput").value;
        const imgSrc = document.getElementById("pixel-preview").src;
        
        const formData = new FormData();
        formData.append("name", name);
        formData.append("image_link", imgSrc); // Directly append image data
        
        fetch('/upload_pixel_art', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Pixel art uploaded successfully') {
                console.log("Upload successful:", data.image_link);
                // Handle successful upload (optional: show confirmation message)
            } else {
                console.error("Error uploading data:", data.error);
                // Handle upload errors (optional: show error message to the user)
            }
            loadInfoInPage()
        })
        
    }
    
});