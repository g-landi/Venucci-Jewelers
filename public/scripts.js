const { ipcRenderer } = require('electron');

ipcRenderer.on('update_available', () => {
    ipcRenderer.removeAllListeners('update_available');
    // Here you can inform the user that an update is available
    document.getElementById('update-message').textContent = 'A new update is available. Downloading now...';
    // you could also trigger a user interface change here
});

ipcRenderer.on('update_downloaded', () => {
    ipcRenderer.removeAllListeners('update_downloaded');
    // Here you can inform the user that the update is ready for installation
    document.getElementById('update-message').textContent = 'Update ready for install. Restart the application to apply the update.';
    // you could also trigger a user interface change here
});

let itemSets = [];


function validatePhoneInput(input) {
    input.value = input.value.replace(/\D/g, '');
}

function validateDueDateInput(input) {
    input.value = input.value.replace(/[^0-9/]/g, '');
}

function validateCustomerNameInput(input) {
    input.value = input.value.replace(/[^a-zA-Z\s]/g, '');
}

function validateEstimateNumberInput(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

function validateTotalInput(input) {
    input.value = input.value.replace(/[^0-9.]/g, '');
}

function formatDueDate(dueDateString) {
    const parts = dueDateString.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    return `${month}/${day}/${year}`;
}

document.getElementById("addItemButton").onclick = function () {
    document.getElementById("itemFields").style.display = "block";
};

document.getElementById("finishItemButton").onclick = function () {
    const itemInput = document.getElementById("item");
    const quantityInput = document.getElementById("quantity");
    const descriptionInput = document.getElementById("description");
    const totalInput = document.getElementById("total");

    let isValid = true;

    if (itemInput.value.trim() === '') {
        itemInput.previousElementSibling.children[1].style.display = 'inline';
        isValid = false;
    } else {
        itemInput.previousElementSibling.children[1].style.display = 'none';
    }
    if (quantityInput.value.trim() === '') {
        quantityInput.previousElementSibling.children[1].style.display = 'inline';
        isValid = false;
    } else {
        quantityInput.previousElementSibling.children[1].style.display = 'none';
    }
    if (descriptionInput.value.trim() === '') {
        descriptionInput.previousElementSibling.children[1].style.display = 'inline';
        isValid = false;
    } else {
        descriptionInput.previousElementSibling.children[1].style.display = 'none';
    }
    if (totalInput.value.trim() === '') {
        totalInput.previousElementSibling.children[1].style.display = 'inline';
        isValid = false;
    } else {
        totalInput.previousElementSibling.children[1].style.display = 'none';
    }

    if (isValid) {
        const item = itemInput.value;
        const quantity = quantityInput.value;
        const description = descriptionInput.value;
        const total = totalInput.value;

        const itemSet = { item, quantity, description, total };


        // Check if a file is selected
        const fileInput = document.getElementById("uploadFile");
        if (fileInput.files.length > 0) {
            console.log("entered  image uploaded");

            const selectedFile = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = function (event) {
                const imageDataUrl = event.target.result;
                itemSet.imageDataUrl = imageDataUrl;

                // Push the itemSet to the itemSets array
                itemSets.push(itemSet);

                // Clear the form inputs and reset the file input
                itemInput.value = "";
                quantityInput.value = "";
                descriptionInput.value = "";
                totalInput.value = "";
                fileInput.value = "";
            };

            reader.readAsDataURL(selectedFile);
        } else {
            console.log("entered no image uploaded");
            // No file selected, push the itemSet to the itemSets array directly
            itemSets.push(itemSet);

            // Clear the form inputs
            itemInput.value = "";
            quantityInput.value = "";
            descriptionInput.value = "";
            totalInput.value = "";
        }

        document.getElementById("itemFields").style.display = "none";
        document.getElementById("addItemButton").style.display = "block";
    }
};

document.getElementById("createReceipt").onclick = async function () {
    const customerName = document.getElementById("customerName").value;
    const estimateNumber = document.getElementById("estimateNumber").value;
    const customerPhone = document.getElementById("customerPhone").value;
    const dueDate = document.getElementById("dueDate").value;

    const currentDate = new Date();
    const formattedDate = (currentDate.getMonth() + 1).toString().padStart(2, '0') + '/' + currentDate.getDate().toString().padStart(2, '0') + '/' + currentDate.getFullYear();

    const formattedCustomerPhone = customerPhone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 - $2 - $3");
    const formattedDueDate = formatDueDate(dueDate);

    const response = await fetch('http://localhost:3000/process-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            customerName,
            estimateNumber,
            customerPhone: formattedCustomerPhone,
            dueDate: formattedDueDate,
            itemSets,
            currentDate: formattedDate
        })
    });


    if (response.ok) {
        console.log('Excel file modified');
        const blob = await response.blob();

        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Create a temporary anchor element
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${customerName}_receipt.xlsx`;

        // Trigger a click event on the anchor element
        downloadLink.click();

        // Clean up the temporary URL
        window.URL.revokeObjectURL(url);
    } else {
        console.error('Error processing the form data');
    }
};


document.getElementById('uploadFile').addEventListener('change', function (event) {
    var selectedFile = event.target.files[0];
    // Process the selected file here
});










