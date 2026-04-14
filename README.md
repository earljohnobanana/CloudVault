# ☁️ Cloud Storage Dashboard Web App

A modern, responsive **Cloud Storage Dashboard Web App** built using **HTML, CSS, and Vanilla JavaScript**.  
This project simulates a real SaaS-style cloud storage platform inspired by **Google Drive, Dropbox, and modern admin dashboards**.

---

## ✨ Features

### 📊 Dashboard Overview
- Total Files, Storage Used, Capacity, and Recent Activity cards
- Real-time dynamic updates
- Smooth hover animations and modern UI styling

### 📁 Full CRUD Storage System (IMPORTANT)
This app includes complete **Create, Read, Update, Delete (CRUD)** functionality:

- ➕ Create new storage items
- 📖 View stored items dynamically
- ✏️ Edit existing items
- 🗑️ Delete items with confirmation
- All changes reflect instantly in the UI

---

### 💾 Data Persistence
- Uses `localStorage` to store all items
- Data remains even after page refresh
- Auto-loads saved items on startup

---

## ➕ Add Item System

- Modal popup form for adding new storage items
- Fields include:
  - Item Name
  - Category (dropdown)
  - Size (MB/GB)
  - Date Added
- Smooth open/close animations
- Toast notification on success ("Item added")

---

## 📂 Display System

- Dynamic table/grid rendering using JavaScript
- Columns:
  - Name
  - Category
  - Size
  - Date Added
  - Actions (Edit / Delete)
- Empty state UI when no items exist

---

## ✏️ Edit Function

- Edit items using modal popup
- Auto-fill form with existing values
- Save updates instantly without reload
- UI refreshes dynamically

---

## 🗑️ Delete Function

- Delete button for each item
- Confirmation prompt before removal
- Smooth fade-out / slide animation
- Toast notification ("Item deleted")

---

## 📊 Storage Tracking System

- Automatically calculates total storage used
- Updates dashboard statistics in real time
- Animated progress bar showing usage vs capacity
- Supports MB and GB conversion logic

---

## 🔍 Search & Filter

- Search items by name
- Filter by category dropdown
- Instant results (no page reload)

---

## 🎨 UI/UX Design

- Sidebar-based SaaS dashboard layout
- Soft modern palette (white, gray, blue accents)
- Glassmorphism effects and soft shadows
- Rounded cards and smooth transitions
- Hover lift animations on cards
- Fully responsive design (desktop + mobile)

---

## 🧱 Layout Structure
📌 Sidebar Navigation

Dashboard
My Files
Storage
Settings

📌 Topbar

Search bar
Profile section
Add Item button

📌 Main Dashboard

Stat cards
Storage visualization
File table/grid
Folder grid
---

## 🛠️ Tech Stack

- HTML5 (Semantic structure)
- CSS3 (Flexbox, Grid, Animations, Glassmorphism)
- Vanilla JavaScript (DOM, CRUD logic, LocalStorage)

---

## ⚙️ How It Works

- All storage data is managed using **JavaScript objects**
- Functions handle:
  - Creating items
  - Rendering UI
  - Updating storage stats
  - Editing and deleting entries
- Data is saved in **localStorage** for persistence
- UI updates dynamically without reload

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/earljohnobanana/CloudVault.git
2. Open the project

Open:

index.html

in your browser.

📱 Responsive Design
Fully responsive for desktop, tablet, and mobile
Adaptive sidebar navigation
Flexible grid layout system
🎯 Future Improvements
Cloud backend integration (Firebase / Node.js)
Drag & drop file uploads
Dark mode toggle
User authentication system
Real cloud sync functionality
👨‍💻 Author

Created by Earl John Obanana

📄 License

This project is open-source and free to use for learning and development.


---

If you want next level upgrade, I can also:
- :contentReference[oaicite:0]{index=0}
- or :contentReference[oaicite:1]{index=1}
- or :contentReference[oaicite:2]{index=2}
