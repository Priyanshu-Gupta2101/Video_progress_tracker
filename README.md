# Video Progress Tracker

A React-based video progress tracking system that accurately measures unique viewing time and provides persistent progress tracking.

## Features

- **Unique Progress Tracking**: Only counts new portions of video watched
- **Interval Merging**: Automatically merges overlapping watched segments
- **Seeking Detection**: Handles fast-forwarding and rewinding accurately
- **Persistent Storage**: Saves progress using sessionStorage
- **Auto-Resume**: Resumes from last watched position
- **Visual Timeline**: Shows watched segments graphically
- **Real-time Statistics**: Displays unique watched time, session time, and segments

## How It Works

1. **Interval Tracking**: Records start/end times of watched segments
2. **Merge Algorithm**: Combines overlapping intervals to prevent double-counting
3. **Progress Calculation**: Converts unique watched time to percentage
4. **Persistence**: Auto-saves every 10 seconds and on page unload

## Usage

1. Play the video to start tracking
2. Progress updates in real-time as you watch
3. Use controls to reset, save, or view detailed intervals
4. Return anytime - video resumes from last position

## Technical Implementation

- React hooks for state management
- useRef for video element references
- useCallback for performance optimization
- sessionStorage for persistence
- Tailwind CSS for styling
