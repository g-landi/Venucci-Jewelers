require('dotenv').config();
const { app, BrowserWindow, screen, nativeImage, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const express = require('express');
const ExcelJS = require('exceljs');
const bodyParser = require('body-parser');




let mainWindow;
const server = express();
const port = 3000;

server.use(express.static('public'));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
server.use(express.json());

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
        autoUpdater.checkForUpdatesAndNotify();
    });

}

server.use(express.static('public'));
server.use(express.json());

server.post('/process-data', async (req, res) => {

    console.log("Server side: ", JSON.stringify(req.body));

    const { customerName, estimateNumber, customerPhone, dueDate, itemSets, currentDate } = req.body;

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

        // Add data to the appropriate columns in the current row
        worksheet.getCell(`A${rowNumber}`).value = item;
        worksheet.getCell(`B${rowNumber}`).value = Number(quantity);
        worksheet.getCell(`C${rowNumber}`).value = description;
        worksheet.getCell(`I${rowNumber}`).value = Number(total);

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


    console.log("Proccess data: " + customerName);


    // Save the modified Excel file to a buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set the response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${customerName}_receipt.xlsx"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the Excel file buffer as the response
    res.status(200).end(buffer, 'binary');

});

server.get('/download-modified', (req, res) => {
    const customerName = req.query.customerName;
    console.log("download-modified: " + customerName);


    res.download(`./${customerName}_receipt.xlsx`, `${customerName}_receipt.xlsx`, (err) => {
        if (err) {
            console.error('Error sending the file:', err);
            res.sendStatus(500);
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
