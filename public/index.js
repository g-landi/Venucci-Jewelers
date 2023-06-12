const { ipcRenderer } = require('electron');

async function getSelectedDirectoryPath() {
    try {
        return await ipcRenderer.invoke('get-last-selected-path');
    } catch (error) {
        console.error('Failed to get last selected path:', error);
    }
}
let itemSets = [];

window.onload = async function () {
    const response = await fetch('http://localhost:3000/items');
    const items = await response.json();

    const dropdown = document.getElementById('dropdown');

    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.textContent = `${item.name} - ${item.price}`;
        div.onclick = function () {
            document.getElementById('item').value = item.name;
            document.getElementById('total').value = item.price;
            dropdown.style.display = 'none';
        };
        dropdown.appendChild(div);
    });

    document.getElementById('triangle').addEventListener('click', function (event) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        event.stopPropagation();  // stop event from bubbling up
    });

    document.addEventListener('click', function (event) {
        const isClickInside = document.getElementById('dropdownInput').contains(event.target);
        if (!isClickInside) {
            dropdown.style.display = 'none';
        }
    });
};



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
    document.getElementById("addItemButton").style.display = "none";
    document.getElementById("createReceipt").style.display = "none";


};

document.getElementById("finishItemButton").onclick = function () {
    const itemInput = document.getElementById("item");
    const quantityInput = document.getElementById("quantity");
    const descriptionInput = document.getElementById("description");
    const totalInput = document.getElementById("total");

    const itemError = document.getElementById("itemError");
    const quantityError = document.getElementById("quantityError");
    const descriptionError = document.getElementById("descriptionError");
    const totalError = document.getElementById("totalError");

    let isValid = true;

    if (itemInput.value.trim() === '') {
        itemError.style.display = 'inline';
        isValid = false;
    } else {
        itemError.style.display = 'none';
    }
    if (quantityInput.value.trim() === '') {
        quantityError.style.display = 'inline';
        isValid = false;
    } else {
        quantityError.style.display = 'none';
    }
    if (descriptionInput.value.trim() === '') {
        descriptionError.style.display = 'inline';
        isValid = false;
    } else {
        descriptionError.style.display = 'none';
    }
    if (totalInput.value.trim() === '') {
        totalError.style.display = 'inline';
        isValid = false;
    } else {
        totalError.style.display = 'none';
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
        document.getElementById("addItemButton").style.display = "inline";
        document.getElementById("createReceipt").style.display = "inline";



    }
};

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [month, day, year].join('/');
}


document.getElementById("createReceipt").onclick = async function () {
    const customerName = document.getElementById("customerName");
    const nameError = document.getElementById("nameError");

    if (customerName.value.trim() === '') {
        nameError.style.display = 'block';
        return;
    } else {
        nameError.style.display = 'none';
    }

    document.body.style.cursor = 'wait'; // Change cursor to wait

    const estimateNumber = document.getElementById("estimateNumber").value;
    const customerPhone = document.getElementById("customerPhone").value;
    const dueDate = document.getElementById("dueDate").value;


    const currentDate = new Date();
    const formattedDate = (currentDate.getMonth() + 1).toString().padStart(2, '0') + '/' + currentDate.getDate().toString().padStart(2, '0') + '/' + currentDate.getFullYear();

    const formattedCustomerPhone = customerPhone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 - $2 - $3");
    let formattedDueDate = formatDate(dueDate);
    console.log(formattedDueDate);;


    let directoryPath = await getSelectedDirectoryPath();
    directoryPath = directoryPath.trim();
    console.log("Client side path:" + directoryPath);
    try {
        const response = await fetch('http://localhost:3000/process-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName: customerName.value,
                estimateNumber,
                customerPhone: formattedCustomerPhone,
                dueDate: formattedDueDate,
                itemSets,
                currentDate: formattedDate,
                directoryPath
            })
        });



        if (response.ok) {
            console.log('Excel file modified');
            const data = await response.json();
            console.log(`Excel file saved at ${data.filePath}`);
        } else {
            console.error('Error processing the form data');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        document.body.style.cursor = 'auto'; // Change cursor back to auto
    }
};




document.getElementById('uploadFile').addEventListener('change', function (event) {
    var selectedFile = event.target.files[0];
    // Process the selected file here
});










