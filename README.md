# GearScout Collection 2026

A modern FRC (FIRST Robotics Competition) scouting application for collecting and submitting match data during competitions.

**Access the application at: [www.gearitforward.com](https://www.gearitforward.com)**

## 📋 Table of Contents

- [Overview](#overview)
- [How to Use](#how-to-use)
  - [Initial Setup](#initial-setup)
  - [Data Collection](#data-collection)
  - [Offline Mode & Pending Matches](#offline-mode--pending-matches)
- [Features](#features)
- [For Developers](#for-developers)

## Overview

GearScout Collection 2026 is a web-based scouting application designed to help FRC teams track and analyze robot performance during competitions. The app supports offline data collection, automatic retry of failed submissions, and real-time match schedule integration via The Blue Alliance API.

Simply visit **www.gearitforward.com** on any device with a web browser to start scouting!

## How to Use

### Initial Setup

When you first visit [www.gearitforward.com](https://www.gearitforward.com), you'll see the login page where you configure your scouting session:

#### Required Fields:

1. **Team Number** - Your team's FRC number (e.g., 2338)
2. **Scouter Name** - Your name or identifier
3. **Event Code** - The official event code (e.g., "2026arc")
4. **Secret Code** - Authentication code provided by your team lead

#### Optional Field:

5. **TBA Code** - The Blue Alliance API key for accessing match schedules
   - Enables automatic team loading based on match number
   - Recommended for faster data entry

#### Quick Setup via URL (Recommended):

Your team lead can provide a pre-configured link like:
```
https://www.gearitforward.com/?team=2338&event=2026arc&secret=yourCode&tba=yourTBAKey
```

When you visit this link, all fields populate automatically and you'll be ready to scout immediately.

#### Submitting Your Configuration:

- Once all required fields are filled, the "GO" button becomes active
- Click **GO** to proceed to the data collection page
- Your settings are automatically saved in your browser

### Data Collection

After setup, you'll be on the main data collection page where you record match data:

#### Match Information:

1. **Match Number** - Enter the match number (0-999)
   - After entering, if TBA is configured, the app loads team numbers for that match
   - A loading spinner indicates schedule data is being fetched

2. **Team Number**
   - **With TBA:** Select from dropdown of teams in the match
   - **Without TBA:** Manually enter the team number

3. **Alliance Color** - Click **RED ALLIANCE** or **BLUE ALLIANCE**

#### Auto Period Tracking:

**Trench Scoring:**
- Click **RED TRENCH** or **BLUE TRENCH** buttons to increment counters
- Numbers appear between the buttons showing current count
- Click the minus **(−)** buttons below to decrement if you make a mistake

**Bump Scoring:**
- Click **RED BUMP** or **BLUE BUMP** buttons to increment counters
- Numbers appear between the buttons showing current count
- Click the minus **(−)** buttons below to decrement if needed

**Accuracy:**
- Select shooting accuracy: **0%**, **25%**, **50%**, **75%**, **95%**, or **100%**
- Represents the robot's autonomous shooting accuracy

**Estimated Size:**
- Choose range: **1-10**, **11-25**, or **26+**
- Estimates total game pieces scored during auto

**Climb:**
- Toggle between **No** and **Yes**
- Indicates if the robot climbed during autonomous period

#### Teleop Period Tracking:

The teleop section uses a cycle-based system to track multiple scoring runs:

**Recording a Cycle:**

1. Select **Accuracy** percentage for the cycle (0%, 25%, 50%, 75%, 95%, 100%)
2. Choose **Estimated Size** range (1-10, 11-25, 26+)
3. Click the **CYCLE** button to record this cycle and start a new one

The app displays:
- **"Cycles: X"** counter showing total cycles recorded
- **"Previous Cycle"** section appears after first cycle, showing your last recorded data
- You can record as many cycles as the robot completes during the match

**Teleop Climb:**
- Toggle between **No** and **Yes**
- Indicates if the robot climbed during teleop period

#### Submitting Data:

1. Fill out all required fields (match number, team number, alliance color)
2. Record auto period data
3. Record teleop cycles and climb status
4. Click the **Submit** button at the bottom
5. If successful:
   - Form resets for the next match
   - You can immediately start scouting the next robot
6. If submission fails (no internet):
   - Data is automatically saved locally
   - You'll see a pending matches indicator

#### Navigation:

- **Back** button - Returns to the login/setup page
- **ANALYTICS** link (header) - Opens [data.gearitforward.com](https://data.gearitforward.com/) to view analytics

### Offline Mode & Pending Matches

The application works offline and stores data when internet is unavailable:

#### How It Works:

- If submission fails (no internet, server issues), matches save automatically to your device
- A **pending matches indicator** appears in the top-right corner
- Shows count like: **"3 pending ↻"**
- Matches are stored with timestamps for later submission

#### Retrying Failed Submissions:

1. Look for the pending indicator in the top-right corner
2. Click the circular arrow **(↻)** button next to the count
3. The app attempts to submit all pending matches
4. Successfully submitted matches are removed from the queue
5. The counter updates to show remaining pending matches

#### Important Notes:

- Pending matches are stored in your browser's local storage
- Data persists even if you close the browser or refresh the page
- You can continue scouting new matches while pending submissions are queued
- The pending count updates automatically every 5 seconds
- Retry submissions when you have stable internet connection

## Features

### Core Capabilities:
✅ Real-time match data collection  
✅ Offline data storage with automatic retry  
✅ The Blue Alliance integration for match schedules  
✅ Alliance-based team selection  
✅ Cycle-based teleop tracking  
✅ Works on tablets, phones, and computers  
✅ No installation required - just visit the website  
✅ Auto-saves your configuration  
✅ Visual pending match indicator and manual retry  

### Data Collected:
- Match and team identification
- Alliance color
- Auto period performance (trench scoring, bump scoring, accuracy, estimated size, climb)
- Teleop cycle data (multiple cycles with accuracy and estimated size each)
- Teleop climb status
- Timestamp for each match submission

### User Experience:
- Intuitive button-based interface for fast data entry
- Minimal typing required during matches
- Visual feedback for all interactions
- Auto-save of user preferences and login settings
- Clear indicators for required vs optional fields
- Responsive design optimized for scouting tablets

## For Developers

### Tech Stack

- **Frontend:** React 18 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Styling:** SCSS/Sass
- **Hosting:** www.gearitforward.com

### Local Development

If you want to contribute or run locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`
4. Build for production: `npm run build`

### Project Structure

```
src/
├── pages/
│   ├── Login.tsx              # Login/configuration page
│   └── DataCollection.tsx     # Main data collection page
├── model/Models.ts            # TypeScript interfaces
├── services/
│   ├── gearscout-services.ts  # API communication
│   ├── matchStorage.ts        # Local storage for offline
│   └── scheduleService.ts     # TBA integration
├── scripts/
│   └── data-collection.ts     # Data collection logic
└── utils/                     # Helper utilities
```

## Support

**For questions or issues:**
- Contact your team lead for event-specific setup
- Check with your scouting coordinator for Secret Codes and TBA keys

**Analytics Dashboard:** [data.gearitforward.com](https://data.gearitforward.com/)

---

**Version:** 2026.0.1  
**URL:** [www.gearitforward.com](https://www.gearitforward.com)