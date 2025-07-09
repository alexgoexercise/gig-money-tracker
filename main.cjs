const { app, BrowserWindow, ipcMain } = require('electron')
const DatabaseManager = require('./database.cjs')
const path = require('path')

// Fix ICU data path for packaged app
if (process.resourcesPath) {
  process.env.ICU_DATA_DIR = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'electron', 'dist')
}

let mainWindow
let dbManager

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // Load the built React app
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

// Initialize database
const initDatabase = () => {
  dbManager = new DatabaseManager()
}

// IPC Handlers for database operations
ipcMain.handle('db-get-all-gigs', async () => {
  return dbManager.getAllGigs()
})

ipcMain.handle('db-add-gig', async (event, gig) => {
  return dbManager.addGig(gig)
})

ipcMain.handle('db-add-regular-gig', async (event, gig, startDate, endDate, dayOfWeek) => {
  return dbManager.addRegularGig(gig, startDate, endDate, dayOfWeek)
})

ipcMain.handle('db-get-gigs-by-type', async (event, gigType) => {
  return dbManager.getGigsByType(gigType)
})



ipcMain.handle('db-update-gig', async (event, id, gig) => {
  return dbManager.updateGig(id, gig)
})



ipcMain.handle('db-delete-gig', async (event, id) => {
  return dbManager.deleteGig(id)
})

ipcMain.handle('db-get-gig-by-id', async (event, id) => {
  return dbManager.getGigById(id)
})



ipcMain.handle('db-get-total-earnings', async () => {
  return dbManager.getTotalEarnings()
})



ipcMain.handle('db-get-all-gig-places', async () => {
  return dbManager.getAllGigPlaces();
})

ipcMain.handle('db-get-occurrence-override', async (event, gigId, date) => {
  return dbManager.getOccurrenceOverride(gigId, date);
});

ipcMain.handle('db-set-occurrence-override', async (event, gigId, date, status, amount, notes) => {
  return dbManager.setOccurrenceOverride(gigId, date, status, amount, notes);
});

ipcMain.handle('db-get-all-occurrence-overrides-for-gig', async (event, gigId) => {
  return dbManager.getAllOccurrenceOverridesForGig(gigId);
});

app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (dbManager) {
    dbManager.close()
  }
})