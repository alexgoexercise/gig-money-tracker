const { app, BrowserWindow, ipcMain } = require('electron')
const DatabaseManager = require('./database.cjs')
const path = require('path')

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
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools()
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

ipcMain.handle('db-update-gig', async (event, id, gig) => {
  return dbManager.updateGig(id, gig)
})

ipcMain.handle('db-delete-gig', async (event, id) => {
  return dbManager.deleteGig(id)
})

ipcMain.handle('db-get-gig-by-id', async (event, id) => {
  return dbManager.getGigById(id)
})

ipcMain.handle('db-get-all-expenses', async () => {
  return dbManager.getAllExpenses()
})

ipcMain.handle('db-add-expense', async (event, expense) => {
  return dbManager.addExpense(expense)
})

ipcMain.handle('db-get-expenses-by-gig', async (event, gigId) => {
  return dbManager.getExpensesByGigId(gigId)
})

ipcMain.handle('db-get-total-earnings', async () => {
  return dbManager.getTotalEarnings()
})

ipcMain.handle('db-get-total-expenses', async () => {
  return dbManager.getTotalExpenses()
})

ipcMain.handle('db-get-net-income', async () => {
  return dbManager.getNetIncome()
})

ipcMain.handle('db-get-all-gig-places', async () => {
  return dbManager.getAllGigPlaces();
})

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