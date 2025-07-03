const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Gig operations
  getAllGigs: () => ipcRenderer.invoke('db-get-all-gigs'),
  addGig: (gig) => ipcRenderer.invoke('db-add-gig', gig),
  addRegularGig: (gig, startDate, endDate, dayOfWeek) => ipcRenderer.invoke('db-add-regular-gig', gig, startDate, endDate, dayOfWeek),
  getGigsByType: (gigType) => ipcRenderer.invoke('db-get-gigs-by-type', gigType),
  updateGig: (id, gig) => ipcRenderer.invoke('db-update-gig', id, gig),
  deleteGig: (id) => ipcRenderer.invoke('db-delete-gig', id),
  getGigById: (id) => ipcRenderer.invoke('db-get-gig-by-id', id),
  
  // Expense operations
  getAllExpenses: () => ipcRenderer.invoke('db-get-all-expenses'),
  addExpense: (expense) => ipcRenderer.invoke('db-add-expense', expense),
  getExpensesByGig: (gigId) => ipcRenderer.invoke('db-get-expenses-by-gig', gigId),
  
  // Analytics
  getTotalEarnings: () => ipcRenderer.invoke('db-get-total-earnings'),
  getTotalExpenses: () => ipcRenderer.invoke('db-get-total-expenses'),
  getNetIncome: () => ipcRenderer.invoke('db-get-net-income'),

  // Gig Place operations
  getAllGigPlaces: () => ipcRenderer.invoke('db-get-all-gig-places'),
  // Optionally expose getOrCreateGigPlace if needed in renderer
  // getOrCreateGigPlace: (name) => ipcRenderer.invoke('db-get-or-create-gig-place', name),

  getOccurrenceOverride: (gigId, date) => ipcRenderer.invoke('db-get-occurrence-override', gigId, date),
  setOccurrenceOverride: (gigId, date, status, amount, notes) => ipcRenderer.invoke('db-set-occurrence-override', gigId, date, status, amount, notes),
  getAllOccurrenceOverridesForGig: (gigId) => ipcRenderer.invoke('db-get-all-occurrence-overrides-for-gig', gigId),
}); 