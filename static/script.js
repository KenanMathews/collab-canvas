document.addEventListener('DOMContentLoaded', function () {
    const grid_comp_width = 400;
    const grid_comp_height = 400;
    const stage = new Konva.Stage({
        container: 'container',
        width: 300,
        height: 300
        
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

    stage.on('mousemove touchmove', function (event) {      // add check to make sure it is within canvas
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
                updatePixel(gridX, gridY, color);
                lastDrawnPixel = { x: gridX, y: gridY };
            }
        }
    }
    

    function updatePixel(x, y, color) {
        // Find the existing pixel at the specified coordinates
        const pixel = drawingLayer.findOne(node => {
            return node.getClassName() === 'Rect' && node.x() === x * pixelSize && node.y() === y * pixelSize;
        });
    
        if (pixel) {
            // Update the color of the existing pixel
            pixel.fill(color);
            drawingLayer.batchDraw();
        } else {
            // If no pixel exists at the specified coordinates, create a new one
            createPixel(x, y, color);
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
    // Function to save draft
        function saveDraft() {
            // Initialize an array to store the drawing state
            const drawingState = [];

            // Convert children to an array and iterate through them
            const children = drawingLayer.children;
            children.forEach(child => {
                // Extract relevant information from each shape
                const pixel = {
                    x: child.x(),
                    y: child.y(),
                    color: child.fill()
                };
                // Add the pixel to the drawing state array
                drawingState.push(pixel);
            });

            // Serialize the drawing state to JSON
            const serializedDrawingState = JSON.stringify(drawingState);

            // Save the serialized drawing state to local storage
            localStorage.setItem('drawingDraft', serializedDrawingState);

            console.log('Draft saved');
        }

        // Function to reload draft
        function reloadDraft() {
            // Retrieve drawing state from local storage
            const savedDrawingState = localStorage.getItem('drawingDraft');
            if (savedDrawingState) {
                // Parse saved drawing state from JSON
                const drawingState = JSON.parse(savedDrawingState);
                // Clear the existing drawing
                drawingLayer.destroyChildren();
                // Loop through the saved drawing state and recreate the drawing
                drawingState.forEach(pixel => {
                    createPixel(pixel.x / pixelSize, pixel.y / pixelSize, pixel.color);
                });
                // Batch redraw to improve performance
                drawingLayer.batchDraw();
                console.log('Draft reloaded');
            } else {
                console.log('No draft found');
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
    async function loadCoordinatesforUpload(){
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        const userName = document.getElementById("nameInput").value;
        // Save the serialized drawing state to local storage
        localStorage.setItem('userName', document.getElementById("nameInput").value);
        try {
                //convert matrix col and row idx to relative coordinate
                const response = await fetch('/get_all_free_coordinates', {
                    headers: {
                        'Content-Type': 'application/json' // Set Content-Type to JSON
                    },
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
        
                const data = await response.json();
                loadInfoPopup("Canvas Grid",'<p class="mb-4">This grid represents the available and occupied locations on the canvas:</p> <div class="flex space-x-4 mb-4"> <div class="flex items-center space-x-2"> <div class="w-4 h-4 bg-green-600"></div> <div>Available Location</div> </div> <div class="flex items-center space-x-2"> <div class="w-4 h-4 bg-red-600"></div> <div>Occupied Location</div> </div> </div><div id="canvas-grid-container" class="max-w-fit w-auto mx-auto"></div>')
                createGrid(4,4,document.getElementById("canvas-grid-container"));
                const allowed_cords = data.allowed_coords;
                allowed_cords.forEach(function (coords) {
                    updateGrid(coords[1],coords[0],{ class: "bg-green-600 hover:bg-green-700" })
                });
                const used_cords = data.used_coords;       
                used_cords.forEach(function (coords) {
                    updateGrid(coords[1],coords[0],{ class: "bg-red-600 hover:bg-red-700" })
                });         
            } 
        catch (error) {
            console.error('Error:', error);
        }
    }
    
    function submitKonvaImage(i, j) {
        const submitButton = document.getElementById('submitButton');
        submitButton.disabled = true;
        const canvasProgressBar = document.getElementById('canvasProgressBar');
        canvasProgressBar.classList.remove("hidden");
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
        formData.append('x', j);
        formData.append('y', i);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            const canvasProgressBar = document.getElementById('canvasProgressBar');
            canvasProgressBar.classList.add("hidden");
            submitButton.disabled = false;
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            showPopup(data.image_link);
            resetEditor();
        })
        .catch(error => {
            const canvasProgressBar = document.getElementById('canvasProgressBar');
            canvasProgressBar.classList.add("hidden");
            submitButton.disabled = false;
            console.error('Error:', error);
        }).finally(()=>{
            loadInfoInPage()
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
        width: 800,
        height: 800
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
                    width: grid_comp_width,           // Image width (modify as needed)
                    height: grid_comp_height           // Image height (modify as needed)
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
        
    const dateSelect = document.getElementById('date-select');
    const updatePreviewBtn = document.getElementById('update-preview-btn');

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
    async function fetchAnnotationDates() {
        try {
            const response = await fetch('/annotation_dates');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching annotations:', error);
            return [];
        }
    }
    async function fetchAnnotationsForDate(selectedDate) {
        try {
            const response = await fetch(`/prev_annotations?date=${selectedDate}`);
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
    async function loadInfoInPage(){
        loadPreviewImage()
        // Usage:
        fetchAnnotations()
        .then(data => {
            const annotationsList = document.getElementById('annotations-list');
            annotationsList.innerText = '';
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
        const annotationDates = await fetchAnnotationDates();
        annotationDates.forEach(date => {
            console.log(date);
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateSelect.appendChild(option);
        });
        const downloadBtn = document.getElementById("download-preview-btn");
        downloadBtn.addEventListener("click", downloadPreviewImage);

        
        // Add event listener to update preview button
        updatePreviewBtn.addEventListener('click', async () => {
            const selectedDate = dateSelect.value;
            // Fetch data for selected date and update preview container
            const annotationsForDate = await fetchAnnotationsForDate(selectedDate);
            preview_stage.destroyChildren();
            addImagesFromJSON(annotationsForDate,preview_stage);
            preview_stage.draw();
            const preview_container = document.getElementById("preview-container");
            preview_container.scrollIntoView({ 
                behavior: 'smooth' 
              });
        });
        document.getElementById("loading-container").classList.add("hidden");
    }
    function resetEditorConfirm(){
        loadInfoPopup("Reset Editor","Are you sure?",function(){
            resetEditor();
            const infoModal = document.getElementById('info-modal');
            infoModal.classList.add('hidden');
        });
    }
    loadInfoInPage();
    // Add event listener to the submit button
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', loadCoordinatesforUpload);
    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', resetEditorConfirm);
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

    function removeClickListener(element) {
        const newElement = element.cloneNode(true); // Create a deep clone of the element to remove listeners
        element.parentNode.replaceChild(newElement, element); // Replace the original element with the clone
        return newElement; // Return the new element without listeners
    }
    
    // Function to download the generated image
    function downloadImage(imgSrc) {
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
    function downloadPreviewImage() {
        exportAsPNG(preview_stage);                 // for Konva canvas
    }
    function downloadPixelPreviewImage() {          // for <img/> element
        downloadImage(document.getElementById("pixel-preview"))
    }

    // Function to handle loading prompt and showing preview (implementation based on your backend logic)
    function loadPromptAndShowPreview(prompt,name) {
        const loader = document.getElementById("generatePreviewProgressBar");
        loader.classList.remove("hidden");
        fetch('/generate_pixel_art', {
            method: 'POST',
            body: JSON.stringify({ prompt: prompt, name, name }),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            const loader = document.getElementById("generatePreviewProgressBar");
            loader.classList.add("hidden");
            if (data.message === "Pixel art generated successfully") {
                const previewElement = document.getElementById("preview-pixel-art");
                previewElement.classList.remove("hidden");
                // Create an image element
                const img = document.getElementById("pixel-preview");
                // Set the src attribute to the image preview URL
                img.src = data.image_link;
                const downloadBtn = document.getElementById("download-btn");
                const updatedDownloadBtn = removeClickListener(downloadBtn);
                updatedDownloadBtn.addEventListener("click", downloadPixelPreviewImage);
                img.scrollIntoView({ 
                    behavior: 'smooth' 
                });
            } else {
                alert("Image limit reached for the day")
                console.error("Error generating preview:", data.error);
                // Handle preview generation errors (optional)
            }
        });
    }
    
    document.getElementById("confirmUploadButton").addEventListener("click", function() {
        if(document.getElementById("nameInput").value.length == 0){
            alert("Fill in a name")
            return;
        }
        const loader = document.getElementById("confirmUploadProgressBar");
        loader.classList.remove("hidden");
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
                const loader = document.getElementById("confirmUploadProgressBar");
                loader.classList.add("hidden");
                // Handle successful upload (optional: show confirmation message)
            } else {
                console.error("Error uploading data:", data.error);
                // Handle upload errors (optional: show error message to the user)
            }
            loadInfoInPage()
        })
        
    }
    function exportAsPNG(stage) {
        // Get the data URL of the canvas
        const dataURL = stage.toDataURL({ mimeType: 'image/png' });
    
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'canvas.png';
    
        // Simulate a click on the link to trigger the download
        document.body.appendChild(link);
        link.click();
    
        // Clean up
        document.body.removeChild(link);
    }
    const infoModal = document.getElementById('info-modal');
    const dismissButton = document.getElementById('dismiss-info-modal');

    // Function to close the modal
    function closeModal() {
        infoModal.classList.add('hidden'); // Hide the modal
    }

    // Add click event listener to the dismiss button
    dismissButton.addEventListener('click', closeModal);

    // Optional: Close the modal when the close icon is clicked
    const closeIcon = document.getElementById('close-info-modal');
    closeIcon.addEventListener('click', closeModal);
    function loadInfoPopup(title, paragraph, callback) {
        // Get references to the title and paragraph elements in the modal
        const titleElement = document.getElementById('info-modal-title');
        const paragraphElement = document.getElementById('info-modal-paragraph');
        const confirmButton = document.getElementById('confirm-info-modal');

        // Set the title and paragraph content
        titleElement.textContent = title;
        paragraphElement.innerHTML = paragraph;

        // Show the modal
        const infoModal = document.getElementById('info-modal');
        infoModal.classList.remove('hidden');

        // Check if a callback function is provided
        if (typeof callback === 'function') {
            // Show the confirm button
            confirmButton.classList.remove('hidden');
            // Add click event listener to the confirm button
            confirmButton.addEventListener('click', callback);
        } else {
            // Hide the confirm button if no callback function is provided
            confirmButton.classList.add('hidden');
        }
    }
    Spectrum.getInstance('#colorPicker', {
        showSelectionPalette: true,
        color: "#0000000",
        showAlpha: false
    });
    const draftBtn = document.getElementById("draftButton");
    draftBtn.addEventListener("click", saveDraft);
    const reloadButton = document.getElementById("reloadButton");
    reloadButton.addEventListener("click", reloadDraft);
    // Call reloadDraft when the page loads
    window.addEventListener('load', function() {
        reloadDraft();
        const userName = localStorage.getItem('userName');
        document.getElementById("nameInput").value = userName;
    });
    window.addEventListener('beforeunload', function(event) {
        const savedDrawingState = localStorage.getItem('drawingDraft');
        if (!savedDrawingState) {
            saveDraft();
        }
    });
    allowed_grid_cols = ['grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4','grid-cols-5','grid-cols-6','grid-cols-7','grid-cols-8',]
    function createGrid(M, N, element) {
        const gridContainer = document.createElement('div');
        gridContainer.setAttribute("id", "canvas-grid");
        gridContainer.classList.add('grid', 'grid-cols-' + N, 'gap-4');
    
        for (let i = 0; i < M; i++) {
            for (let j = 0; j < N; j++) {
                const gridItem = document.createElement('div');
                gridItem.setAttribute("data-row", i);
                gridItem.setAttribute("data-col", j);
                gridItem.classList.add('grid-item', 'w-20', 'h-20', 'bg-gray-200', 'border', 'border-gray-300', 'rounded-md', 'flex', 'items-center', 'justify-center', 'transition-colors', 'duration-300');
                gridContainer.appendChild(gridItem);
            }
        }
        element.innerHTML = gridContainer.outerHTML;
        const items = element.querySelectorAll('.grid-item')
        items.forEach(el => el.addEventListener('click', event => {
            if(event.target.classList.contains("bg-green-600")){
                checkIfGridLocationFree(event.target.getAttribute("data-row"),event.target.getAttribute("data-col"))
            }else{
                alert("Location already occupied");
            }
        }));
    }
    let isBlocked = false
    async function checkIfGridLocationFree(i, j) {
        try {
            if(!isBlocked){
                isBlocked = true
                //convert matrix col and row idx to relative coordinate
                const formData = { x: j, y: i }; // Data to be sent
                const response = await fetch('/check_free_coordinates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' // Set Content-Type to JSON
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
        
                const data = await response.json();
        
                if (data.isFree) {
                    submitKonvaImage(i,j);
                    closeModal();
                } else {
                    updateGrid(i, j, { class: "bg-red-600 hover:bg-red-700" }); // Update class if location is occupied
                }
                isBlocked = false;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }    
    
    function updateGrid(rowIndex, colIndex, updateData) {
        const gridItems = document.querySelectorAll('.grid-item');
        const n = 4;
        const index = (rowIndex * n) + colIndex;
        console.log(index)
        if (index < gridItems.length) {
            const gridItem = gridItems[index];
            if (updateData.class) {
                gridItem.classList.add(...updateData.class.split(' '));
            }
            if (updateData.innerText) {
                gridItem.innerText = updateData.innerText;
            }
        } else {
            console.error('Index out of range.');
        }
    }
    
});