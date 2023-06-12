const { ipcRenderer } = require('electron');

// Fetch items from the server when the page is loaded
document.addEventListener('DOMContentLoaded', fetchItems);

// Fetch items from the server
function fetchItems() {
    fetch('http://localhost:3000/items')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(items => {
            const itemList = document.getElementById('item-list');
            for (const [index, item] of items.entries()) {
                const listItem = createListItem(item, index);
                itemList.appendChild(listItem);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

const downloadLocationButton = document.getElementById('downloadLocation');
const selectedPathSpan = document.getElementById('selected-path');

window.onload = function() {
  ipcRenderer.invoke('get-last-selected-path').then(selectedDirectory => {
    selectedPathSpan.textContent = selectedDirectory;
  }).catch(error => {
    console.error('Failed to get last selected path:', error);
    selectedPathSpan.textContent = 'No directory selected';
  });
};


downloadLocationButton.addEventListener('click', async () => {
    ipcRenderer.invoke('get-file-path').then(selectedDirectory => {
        if (selectedDirectory) {
            // Here you can write the selected directory to a file.
            console.log('Selected directory:', selectedDirectory);
            // you can now write the selected directory to a file or do whatever you want with it.

            // Display the selected directory path.
            selectedPathSpan.textContent = selectedDirectory;
        } else {
            console.error('No directory selected');
            selectedPathSpan.textContent = 'No directory selected';
        }
    }).catch(error => {
        console.error('Failed to get directory:', error);
    });
});


function addItem() {
    const itemName = document.getElementById('itemNameInput').value;
    const itemPrice = document.getElementById('itemPriceInput').value;

    if (itemName && itemPrice) {
        const newItem = {
            name: itemName,
            price: itemPrice
        };

        // Check if there's an item being edited
        const editingItem = document.querySelector('.editing');
        if (editingItem) {

            // Create oldItemString
            const oldItemInfo = editingItem.querySelector('.item-info').textContent;
            const [oldItemName, oldItemPrice] = oldItemInfo.split(' - $');
            const oldItem = {
                name: oldItemName,
                price: oldItemPrice
            };
            const oldItemString = `Name: ${oldItem.name}, Price: ${oldItem.price}`;
            console.log("old item: " + oldItemString);


            // Update the item
            editingItem.querySelector('.item-info').textContent = `${newItem.name} - $${newItem.price}`;
            editingItem.classList.remove('editing');


            // Send the edit request to the server
            fetch('http://localhost:3000/edit-item', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ oldItemString, newItem })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    console.log('Item edited successfully:', data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        } else {
            // Create a new item
            const listItem = createListItem(newItem);
            const itemList = document.getElementById('item-list');
            itemList.appendChild(listItem);

            // Send the new item to the server
            fetch('http://localhost:3000/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newItem)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    console.log('Item added successfully:', data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }

        document.getElementById('itemNameInput').value = '';
        document.getElementById('itemPriceInput').value = '';

        // Hide the Add Item area after adding the item
        document.getElementById('addItemArea').style.display = 'none';
        document.getElementById('addItemButton').style.display = 'block';
        document.getElementById('item-list').style.display = 'block';
    }
}


// Create HTML for a single item
function createListItem(item, id) {
    const listItem = document.createElement('li');
    listItem.dataset.id = id;
    listItem.innerHTML = `
    <span class="item-info">${item.name} - $${item.price}</span>
    <span class="edit-item" onclick="editItem(this)"><i class="fas fa-edit"></i></span>
    <span class="delete-item" onclick="deleteItem(this)"><i class="fas fa-trash"></i></span>
    `;

    return listItem;
}

// Edit an existing item
function editItem(element) {
    const listItem = element.parentNode;
    const itemInfoElement = listItem.querySelector('.item-info');

    if (itemInfoElement) {
        const itemInfo = itemInfoElement.textContent;
        const [itemName, itemPrice] = itemInfo.split(' - $');

        document.getElementById('itemNameInput').value = itemName;
        document.getElementById('itemPriceInput').value = itemPrice;

        // Highlight the editing item
        listItem.classList.add('editing');

        // Show the Edit Item area
        document.getElementById('addItemArea').style.display = 'block';
        document.getElementById('addItemButton').style.display = 'none';
        document.getElementById('finishItemButton').style.display = 'block';
        document.getElementById('item-list').style.display = 'none';
    }
}

// Delete an item
function deleteItem(element) {
    const listItem = element.parentNode;
    const itemInfoElement = listItem.querySelector('.item-info');

    if (itemInfoElement) {
        const itemInfo = itemInfoElement.textContent;
        const [itemName, itemPrice] = itemInfo.split(' - $');

        const item = {
            name: itemName,
            price: itemPrice
        };

        const itemString = `Name: ${item.name}, Price: ${item.price}`;

        listItem.remove(); // Remove the item from the list
        // Remove the 'editing' class if the item was being edited
        if (listItem.classList.contains('editing')) {
            listItem.classList.remove('editing');
        }
        // Send the delete request to the server
        fetch('http://localhost:3000/delete-item', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ itemString })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                console.log('Item deleted successfully:', data);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

// Event listeners
document.getElementById('addItemButton').addEventListener('click', () => {
    // Clear the input fields
    document.getElementById('itemNameInput').value = '';
    document.getElementById('itemPriceInput').value = '';

    // Hide the Add Item area
    document.getElementById('addItemArea').style.display = 'block';
    document.getElementById('addItemButton').style.display = 'none';

    // Hide the item list
    document.getElementById('item-list').style.display = 'none';
});

document.getElementById('finishItemButton').addEventListener('click', () => {
    const listItem = document.querySelector('.item-list .editing');

    if (listItem) {
        // If an item is being edited
        const itemInfoElement = listItem.querySelector('.item-info');
        const oldItemString = itemInfoElement.textContent;
        const newItem = {
            name: document.getElementById('itemNameInput').value,
            price: document.getElementById('itemPriceInput').value
        };

        fetch('http://localhost:3000/edit-item', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldItemString, newItem })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                console.log('Item updated successfully:', data);
                listItem.classList.remove('editing');
                itemInfoElement.textContent = `${newItem.name} - $${newItem.price}`;
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        // If a new item is being added
        addItem();
    }

    // Clear the input fields
    document.getElementById('itemNameInput').value = '';
    document.getElementById('itemPriceInput').value = '';



    // Show the Add Item area
    document.getElementById('addItemArea').style.display = 'none';
    document.getElementById('addItemButton').style.display = 'block';

    // Show the item list
    document.getElementById('item-list').style.display = 'block';
});

