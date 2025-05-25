import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Save, BarChart3, Target, TrendingUp } from "lucide-react";

const VideoProgressTracker = () => {
  const videoRef = useRef(null);
  const [watchedIntervals, setWatchedIntervals] = useState([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [uniqueWatchedTime, setUniqueWatchedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [sessionWatchedTime, setSessionWatchedTime] = useState(0);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showStatus, setShowStatus] = useState(false);

  const currentWatchStart = useRef(null);
  const lastPosition = useRef(0);
  const saveInterval = useRef(null);
  const hasResumed = useRef(false);

  // Merge overlapping intervals
  const mergeIntervals = useCallback((intervals) => {
    if (intervals.length <= 1) return intervals;

    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const lastMerged = merged[merged.length - 1];

      if (current.start <= lastMerged.end + 1) {
        // Added small buffer for continuity
        lastMerged.end = Math.max(lastMerged.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }, []);

  // Calculate unique watched time
  const calculateUniqueTime = useCallback((intervals) => {
    return intervals.reduce((total, interval) => {
      return total + (interval.end - interval.start);
    }, 0);
  }, []);

  // Record watched segment
  const recordWatchedSegment = useCallback(() => {
    if (currentWatchStart.current !== null && videoRef.current) {
      const start = currentWatchStart.current;
      const end = videoRef.current.currentTime;

      if (end > start && end - start >= 0.5) {
        // Minimum 0.5 second segments
        const newInterval = { start, end };
        setWatchedIntervals((prev) => {
          const updated = [...prev, newInterval];
          const merged = mergeIntervals(updated);

          // Update session time
          const sessionTime = end - start;
          setSessionWatchedTime((prevSession) => prevSession + sessionTime);

          return merged;
        });
      }
    }
    currentWatchStart.current = null;
  }, [mergeIntervals]);

  // Handle video play
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    if (videoRef.current) {
      currentWatchStart.current = videoRef.current.currentTime;
    }
  }, []);

  // Handle video pause
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    recordWatchedSegment();
  }, [recordWatchedSegment]);

  // Handle video seek
  const handleSeeked = useCallback(() => {
    recordWatchedSegment();
    if (videoRef.current && !videoRef.current.paused) {
      currentWatchStart.current = videoRef.current.currentTime;
    }
  }, [recordWatchedSegment]);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const timeDiff = Math.abs(currentTime - lastPosition.current);

      // Detect seeking (jump > 2 seconds)
      if (timeDiff > 2) {
        // Record the segment before the seek
        recordWatchedSegment();
        // Start new segment from the seeked position
        if (!videoRef.current.paused) {
          currentWatchStart.current = currentTime;
        }
      }

      lastPosition.current = currentTime;
    }
  }, [recordWatchedSegment]);

  // Handle video end
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    recordWatchedSegment();
  }, [recordWatchedSegment]);

  // Load progress from storage (using sessionStorage for demo)
  const loadProgress = useCallback(() => {
    try {
      const saved = sessionStorage.getItem("videoProgress");
      if (saved) {
        const data = JSON.parse(saved);
        setWatchedIntervals(data.intervals || []);
        setSessionWatchedTime(data.sessionTime || 0);

        // Resume from last position when video metadata is available
        if (videoRef.current && data.lastPosition && !hasResumed.current) {
          videoRef.current.currentTime = data.lastPosition;
          lastPosition.current = data.lastPosition;
          hasResumed.current = true;
          showStatusMessage(`Resumed from ${formatTime(data.lastPosition)}`);
        }
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  }, []);

  // Save progress to storage
  const saveProgressToStorage = useCallback(() => {
    try {
      const progressData = {
        intervals: watchedIntervals,
        lastPosition: videoRef.current?.currentTime || 0,
        totalDuration: totalDuration,
        sessionTime: sessionWatchedTime,
        timestamp: Date.now(),
        progressPercentage: currentProgress,
      };

      sessionStorage.setItem("videoProgress", JSON.stringify(progressData));
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }, [watchedIntervals, totalDuration, sessionWatchedTime, currentProgress]);

  // Update display values
  useEffect(() => {
    const uniqueTime = calculateUniqueTime(watchedIntervals);
    setUniqueWatchedTime(uniqueTime);

    if (totalDuration > 0) {
      setCurrentProgress((uniqueTime / totalDuration) * 100);
    }
  }, [watchedIntervals, totalDuration, calculateUniqueTime]);

  // Handle metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setTotalDuration(videoRef.current.duration);
      // Load and resume progress after video metadata is available
      setTimeout(() => loadProgress(), 100); // Small delay to ensure video is ready
    }
  }, [loadProgress]);

  // Initialize progress from storage on component mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Auto-save interval and cleanup
  useEffect(() => {
    saveInterval.current = setInterval(() => {
      saveProgressToStorage();
    }, 10000); // Save every 10 seconds

    return () => {
      if (saveInterval.current) {
        clearInterval(saveInterval.current);
      }
    };
  }, [saveProgressToStorage]);

  // Save progress on intervals change
  useEffect(() => {
    if (watchedIntervals.length > 0) {
      saveProgressToStorage();
    }
  }, [watchedIntervals, saveProgressToStorage]);

  // Reset progress
  const resetProgress = useCallback(() => {
    if (window.confirm("Are you sure you want to reset all progress?")) {
      setWatchedIntervals([]);
      setCurrentProgress(0);
      setUniqueWatchedTime(0);
      setSessionWatchedTime(0);
      currentWatchStart.current = null;
      lastPosition.current = 0;
      hasResumed.current = false;

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }

      // Clear stored progress
      sessionStorage.removeItem("videoProgress");

      showStatusMessage("Progress reset successfully!");
    }
  }, []);

  // Show status message
  const showStatusMessage = useCallback((message) => {
    setStatusMessage(message);
    setShowStatus(true);
    setTimeout(() => setShowStatus(false), 3000);
  }, []);

  // Save progress (with actual storage implementation)
  const saveProgress = useCallback(() => {
    saveProgressToStorage();
    showStatusMessage("Progress saved successfully!");
  }, [saveProgressToStorage, showStatusMessage]);

  // Show intervals data
  const showIntervals = useCallback(() => {
    let message = "Watched Intervals:\n\n";

    watchedIntervals.forEach((interval, index) => {
      message += `Segment ${index + 1}: ${formatTime(
        interval.start
      )} - ${formatTime(interval.end)} (${formatTime(
        interval.end - interval.start
      )})\n`;
    });

    message += `\nTotal Unique Time: ${formatTime(uniqueWatchedTime)}`;
    message += `\nProgress: ${Math.round(currentProgress)}%`;
    message += `\nTotal Duration: ${formatTime(totalDuration)}`;

    alert(message);
  }, [watchedIntervals, uniqueWatchedTime, currentProgress, totalDuration]);

  // Format time helper
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Save progress before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgressToStorage();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveProgressToStorage]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Video Progress Tracker
          </h1>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Video Container */}
          <div className="mb-6">
            <video
              ref={videoRef}
              className="w-full h-auto rounded"
              controls
              onPlay={handlePlay}
              onPause={handlePause}
              onSeeked={handleSeeked}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedMetadata={handleLoadedMetadata}
            >
              <source
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Progress Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Progress
              </h2>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(currentProgress)}%
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded p-3 text-center border">
                <div className="text-lg font-semibold text-blue-600 mb-1">
                  {formatTime(uniqueWatchedTime)}
                </div>
                <div className="text-xs text-gray-500 uppercase">
                  Unique Watched
                </div>
              </div>

              <div className="bg-white rounded p-3 text-center border">
                <div className="text-lg font-semibold text-green-600 mb-1">
                  {formatTime(totalDuration)}
                </div>
                <div className="text-xs text-gray-500 uppercase">
                  Total Length
                </div>
              </div>

              <div className="bg-white rounded p-3 text-center border">
                <div className="text-lg font-semibold text-orange-600 mb-1">
                  {formatTime(sessionWatchedTime)}
                </div>
                <div className="text-xs text-gray-500 uppercase">
                  This Session
                </div>
              </div>

              <div className="bg-white rounded p-3 text-center border">
                <div className="text-lg font-semibold text-purple-600 mb-1">
                  {watchedIntervals.length}
                </div>
                <div className="text-xs text-gray-500 uppercase">Segments</div>
              </div>
            </div>
          </div>

          {/* Intervals Visualization */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Watched Segments
            </h3>
            <div className="bg-gray-200 rounded h-8 relative overflow-hidden">
              {totalDuration > 0 &&
                watchedIntervals.map((interval, index) => {
                  const startPercent = (interval.start / totalDuration) * 100;
                  const width =
                    ((interval.end - interval.start) / totalDuration) * 100;

                  return (
                    <div
                      key={index}
                      className="absolute h-full bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(width, 0.5)}%`,
                      }}
                      title={`${formatTime(interval.start)} - ${formatTime(
                        interval.end
                      )} (${formatTime(interval.end - interval.start)})`}
                    />
                  );
                })}
              {watchedIntervals.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Start watching to see progress
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={resetProgress}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            <button
              onClick={saveProgress}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>

            <button
              onClick={showIntervals}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Show Details
            </button>
          </div>

          {/* Status Message */}
          {showStatus && (
            <div className="mt-4 text-center">
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded inline-block">
                {statusMessage}
              </div>
            </div>
          )}

          {/* Progress Summary */}
          <div className="mt-6 text-center text-gray-600">
            <p className="text-sm">
              Progress is automatically saved every 10 seconds.
              {watchedIntervals.length > 0 && (
                <span className="block mt-1 text-xs text-gray-500">
                  {watchedIntervals.length} unique segment
                  {watchedIntervals.length !== 1 ? "s" : ""} totaling{" "}
                  {formatTime(uniqueWatchedTime)}.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoProgressTracker;
