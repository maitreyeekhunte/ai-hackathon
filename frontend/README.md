# Expense Tracker UI

A modern, minimal React UI for the Expense Tracker API.

## Features

- ✨ **Add Expenses** - Quickly add individual expenses with category, amount, and date
- 📤 **CSV Upload** - Bulk import expenses from CSV files
- 📊 **View & Filter** - Browse expenses with date range and monthly filters
- 📈 **Statistics** - See total, average, and count of expenses

## Setup

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

### Running the Development Server

Start the React development server:
```bash
npm run dev
```

The UI will be available at `http://localhost:3000`

**Make sure the FastAPI backend is running on `http://localhost:8000`** before using the UI.

## CSV Import Format

The CSV file should have these columns:
- `description` - Item description
- `category` - One of: food, transport, entertainment, utilities, shopping, health, other
- `amount` - Numeric amount
- `date` - Date in YYYY-MM-DD format

Example:
```csv
description,category,amount,date
Coffee,food,4.50,2024-05-20
Gas,transport,45.00,2024-05-20
Movie,entertainment,12.00,2024-05-21
```

## Build for Production

```bash
npm run build
```

Output will be in the `dist` folder.
