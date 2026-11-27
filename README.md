# Study Planner — All-in-One Board & Exam Tracker

A clean, fast, 100% static HTML/CSS/JS + JSON study tracker that runs directly in your browser using `localStorage` — no backend, no build step, and works offline.

## Included Boards & Competitive Exams (15 Tracks · 3,987 Chapters)
- **National & International**: CBSE (NCERT 9–12), CISCE (ICSE 10 & ISC 12), NIOS (Secondary & Sr. Secondary), Cambridge (IGCSE & AS/A-Level)
- **State Boards**: Kerala (SCERT SSLC & DHSE +1/+2), Maharashtra (MSBSHSE SSC & HSC), Tamil Nadu (Samacheer Kalvi 10–12), Karnataka (KSEAB SSLC & 1st/2nd PUC), West Bengal (WBBSE Madhyamik & WBCHSE Sem 1–4), Gujarat (GSEB 10–12), UP Board (UPMSP 10–12), Rajasthan (RBSE 10–12), AP & Telangana (BIEAP / TSBIE SSC & Inter 1st/2nd Year)
- **Competitive Exams**: JEE Main & Advanced (NTA/IIT), NEET UG (NMC/NTA) — usable either standalone or bundled as an add-on with any Class 11/12 board

## How to Use
1. Extract this ZIP and double-click `index.html` (or deploy the folder directly to GitHub Pages).
2. Create your profile (name, board, class, optional JEE/NEET add-on, and subjects).
3. All progress, daily plans, revision dates, and exam scores are saved in your browser's `localStorage`, with JSON backup export/restore built in (including legacy `class12-tracker-backup` v1 import).

## Folder Structure
- `index.html` — Main app entry point
- `css/style.css` — Clean minimal light & forest-sage dark theme
- `js/app.js` — Multi-user state, onboarding wizard, tracker, planner, revision & exam analytics
- `js/icons.js` — Custom offline SVG emblems for all 15 boards & subject icons
- `data/syllabus.json` — Complete human-readable JSON database of all boards, classes, subjects, and chapters
- `data/syllabus.js` — Offline `file://` fallback generated from `data/syllabus.json`
- `manifest.json` & `assets/icon.svg` — App icon and PWA manifest

## Credits
Made with `<3` by **SBP 359**
- GitHub: https://github.com/sbp359
- Support on Ko-fi: https://ko-fi.com/sbp359
