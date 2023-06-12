require('dotenv').config()
const { app, BrowserWindow, screen, nativeImage, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const express = require('express');
const ExcelJS = require('exceljs');
const bodyParser = require('body-parser');
const fs = require('fs')
const { exec } = require('child_process');



let mainWindow;
const server = express();
const port = 3000;

server.use(express.static('public'));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
server.use(express.json());

const downloadDirectoryPath = path.join(__dirname, 'download_directory.txt');

ipcMain.handle('get-last-selected-path', async (event) => {
    try {
        const data = fs.readFileSync(downloadDirectoryPath, 'utf8');
        return data;
    } catch (err) {
        console.error('Error:', err);
        return null;
    }
});


ipcMain.handle('get-file-path', async (event) => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });

    if (filePaths[0]) {
        const file = path.join(__dirname, 'download_directory.txt');

        fs.access(file, fs.constants.F_OK, (err) => {
            if (err) {
                // File does not exist, create and write to it
                fs.writeFile(file, filePaths[0], err => {
                    if (err) {
                        console.error(err);
                        // Handle error...
                    } else {
                        // File has been created and written to...
                    }
                });
            } else {
                // File does exist, append to it
                fs.writeFile(file, `\n${filePaths[0]}`, err => {
                    if (err) {
                        console.error(err);
                        // Handle error...
                    } else {
                        // Existing file has been written to...
                    }
                });
            }
        });
        return filePaths[0];
    }
});



server.use(express.static('public'));
server.use(express.json());

server.post('/process-data', async (req, res) => {

    console.log("Server side: ", JSON.stringify(req.body));

    const { customerName, estimateNumber, customerPhone, dueDate, itemSets, currentDate, directoryPath } = req.body;

    const workbook = new ExcelJS.Workbook();

    // Read the Excel file
    await workbook.xlsx.readFile(path.join(__dirname, 'reciept.xlsx'));

    const worksheet = workbook.getWorksheet('Sheet1');

    // Customer Name
    const name = worksheet.getCell('A9');
    name.value = customerName;
    name.alignment = { vertical: 'top' };

    // Current Date
    const date = worksheet.getCell('G7');
    const currentValueDate = date.value;
    const newValue_data = currentValueDate + ' ' + currentDate;
    date.value = newValue_data;

    // Estimate Number
    const estimateNum = worksheet.getCell('G8');
    const current_En = estimateNum.value;
    const newValue_En = current_En + ' ' + estimateNumber;
    estimateNum.value = newValue_En;

    // Customer Phone number
    const number = worksheet.getCell('G9');
    const current_num = number.value;
    const newValue_num = current_num + ' ' + customerPhone;
    number.value = newValue_num;

    // Due Date
    const due_date = worksheet.getCell('G10');
    const current_dueDate = due_date.value;
    const newValue_dueDate = current_dueDate + ' ' + dueDate;
    due_date.value = newValue_dueDate;

    // Start updating the Excel file with item sets
    let rowNumber = 14; // Assuming the first row for item sets starts at row 14
    let columnStart = 1;  // start from column 1 (which is A)
    const rowStart = 21;  // start from row 21
    const columnCount = 2;  // define column count for each image
    const rowCount = 2;  // define row count for each image
    const columnGap = 1;  // define column gap

    for (const itemSet of itemSets) {
        const { item, quantity, description, total, imageDataUrl } = itemSet;
        const totalCost = quantity * total;

        // Add data to the appropriate columns in the current row
        worksheet.getCell(`A${rowNumber}`).value = item;
        worksheet.getCell(`B${rowNumber}`).value = Number(quantity);
        worksheet.getCell(`C${rowNumber}`).value = description;
        worksheet.getCell(`I${rowNumber}`).value = Number(totalCost);

        if (imageDataUrl) {
            const base64 = imageDataUrl.split(",")[1]; // Remove the data URL prefix
            const imageId = workbook.addImage({
                base64: base64,
                extension: 'jpeg',
            });

            const columnLetterImageStart = String.fromCharCode(64 + columnStart);
            const columnLetterImageEnd = String.fromCharCode(64 + columnStart + columnCount - 1);
            worksheet.addImage(imageId, `${columnLetterImageStart}${rowStart}:${columnLetterImageEnd}${rowStart + rowCount - 1}`);
            //worksheet.getCell(`${columnLetterItem}${rowStart}`).value = item; // add the item name

            columnStart += columnCount + columnGap; // Increment the column start for the next image
        }

        // Increment the row number for the next item set
        rowNumber++;
    }

    const fileName = `${customerName}_receipt.xlsx`;
    const filePath = path.join(directoryPath, fileName);

    console.log("server side file path: " + filePath);

    // Make sure the directory exists
    fs.mkdirSync(directoryPath, { recursive: true });

    // Save the modified Excel file to the specified directory
    await workbook.xlsx.writeFile(filePath);


    // Open the file
    exec(`start "" "${filePath}"`, (err) => {
        if (err) {
            console.error("Failed to open file:", err);
        } else {
            console.log("Excel file opened.");
            // Respond with success status and the path to the file
        }
    });

    // Respond with success status and the path to the file
    res.status(200).json({ filePath });


});



server.post('/add-item', (req, res) => {
    try {
        const { name, price } = req.body;
        const item = `Name: ${name}, Price: ${price}`;

        // Path to the file
        const filePath = path.join(__dirname, 'file.txt');

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // File does not exist, create and write to it
                fs.writeFile(filePath, item, err => {
                    if (err) {
                        console.error(err);
                        res.status(500).send("Error writing to new file");
                    } else {
                        res.send("New file has been created and written to");
                    }
                });
            } else {
                // File does exist, append to it
                fs.appendFile(filePath, `\n${item}`, err => {
                    if (err) {
                        console.error(err);
                        res.status(500).send("Error appending to existing file");
                    } else {
                        res.send("Existing file has been written to");
                    }
                });
            }
        });
    } catch (error) {
        console.error("Error in /edit-text-file handler:", error);
        res.status(500).send("Internal server error");
    }
});

server.get('/items', (req, res) => {
    const filePath = path.join(__dirname, 'file.txt');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error reading the file");
        } else {
            // Convert the data to an array of items
            const lines = data.split('\n');
            const items = lines.filter(line => line.trim() !== '').map(line => {
                const [name, price] = line.split(', Price: ');
                return { name: name.replace('Name: ', ''), price };
            });

            res.send(items);
        }
    });
});


server.delete('/delete-item', (req, res) => {
    const { itemString } = req.body;

    fs.readFile(path.join(__dirname, 'file.txt'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            res.status(500).send('Error reading the file');
        } else {
            const newData = data.split('\n').filter(line => line.trim() !== itemString.trim()).join('\n');
            fs.writeFile(path.join(__dirname, 'file.txt'), newData, 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to the file:', err);
                    res.status(500).send('Error writing to the file');
                } else {
                    res.send('Item deleted successfully');
                }
            });
        }
    });
});



// This endpoint will edit existing items
server.put('/edit-item', (req, res) => {
    const { oldItemString, newItem } = req.body;

    fs.readFile(path.join(__dirname, 'file.txt'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            res.status(500).send('Error reading the file');
        } else {
            const lines = data.split('\n');
            const nonEmptyLines = lines.filter(line => line.trim() !== '');
            const index = lines.findIndex(line => line.trim() === oldItemString.trim());

            if (index !== -1) {
                nonEmptyLines[index] = `Name: ${newItem.name}, Price: ${newItem.price}`;
                fs.writeFile(path.join(__dirname, 'file.txt'), nonEmptyLines.join('\n'), 'utf8', (err) => {
                    if (err) {
                        console.error('Error writing to the file:', err);
                        res.status(500).send('Error writing to the file');
                    } else {
                        res.send('Item updated successfully');
                    }
                });
            } else {
                res.status(400).send('Item not found');
            }
        }
    });
});



app.on('ready', () => {
    // Start your server when the app is ready
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
        createWindow();
    });

    autoUpdater.on('update-available', () => {
        mainWindow.webContents.send('update_available');
    });
    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update_downloaded');
    });
    autoUpdater.on('checking-for-update', () => {
        console.log("Checking for updates...");
    });
    autoUpdater.on('update-not-available', () => {
        console.log("Update not available");
    });
    autoUpdater.on('update-downloaded', () => {
        console.log("Update downloaded");
    });
    autoUpdater.checkForUpdates();
});

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

autoUpdater.on('error', (error) => {
    console.log(`Update Error: ${error}`);
});

function createWindow() {

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const iconPath = path.join(__dirname, 'icon.ico'); // Replace 'icon.png' with your actual icon file name
    const appIcon = nativeImage.createFromPath(iconPath);


    mainWindow = new BrowserWindow({
        movable: false,
        frame: true,
        fullscreen: false,
        fullscreenable: true,
        resizable: false,
        title: 'Receipt Generator',
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,

        },
        icon: appIcon // Set the icon for the window

    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, 'public/index.html'),
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        autoUpdater.setFeedURL('https://github.com/g-landi/Venucci-Jewelers/releases');

        autoUpdater.checkForUpdatesAndNotify();
    });
}