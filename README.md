# 💰 Gig Money Tracker

A desktop application built with Electron and SQLite to help freelancers track their income and expenses.

## Features

- **Gig Management**: Add, edit, and delete freelance gigs
- **Income Tracking**: Track earnings with status updates (pending, completed, cancelled)
- **Expense Tracking**: Record expenses associated with gigs
- **Financial Analytics**: View total earnings, expenses, and net income
- **Modern UI**: Clean, responsive interface with real-time updates
- **Local Storage**: Data stored locally using SQLite database

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with better-sqlite3
- **Desktop Framework**: Electron
- **Database**: SQLite

## Installation

1. Clone the repository:
```bash
git clone https://github.com/alexgoexercise/gig-money-tracker.git
cd gig-money-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

## Development

For development with DevTools enabled:
```bash
npm run dev
```

## Database Schema

### Gigs Table
- `id` - Primary key
- `title` - Gig title/name
- `description` - Optional description
- `amount` - Payment amount
- `date` - Gig date
- `status` - Status (pending, completed, cancelled)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Expenses Table
- `id` - Primary key
- `gig_id` - Foreign key to gigs table
- `description` - Expense description
- `amount` - Expense amount
- `date` - Expense date
- `category` - Expense category
- `created_at` - Creation timestamp

## Project Structure

```
gig-money-tracker/
├── main.js          # Main Electron process
├── preload.js       # Preload script for secure IPC
├── database.js      # Database management module
├── index.html       # Main application UI
├── renderer.js      # Frontend logic
├── package.json     # Project configuration
└── README.md        # Project documentation
```

## Usage

1. **Adding a Gig**: Fill out the form on the left side with gig details and click "Add Gig"
2. **Viewing Gigs**: All gigs are displayed on the right side with their status and amount
3. **Editing Gigs**: Click the "Edit" button on any gig to modify its details
4. **Deleting Gigs**: Click the "Delete" button to remove a gig (with confirmation)
5. **Financial Overview**: View your total earnings, expenses, and net income at the top

## Data Storage

The application stores all data locally in a SQLite database file located in the user's application data directory:
- **Windows**: `%APPDATA%/gig-money-tracker/gig-money-tracker.db`
- **macOS**: `~/Library/Application Support/gig-money-tracker/gig-money-tracker.db`
- **Linux**: `~/.config/gig-money-tracker/gig-money-tracker.db`

## Security

- Context isolation is enabled for security
- Database operations are handled through secure IPC channels
- No external network requests are made

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License 