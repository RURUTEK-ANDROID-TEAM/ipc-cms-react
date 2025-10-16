import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
} from "react";

export interface ClapprActions {
  play(): void;
  pause(): void;
  seek(time: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  isPlaying(): boolean;
}

type ClapprProps = {
  url: string;
  muted?: boolean;
  autoPlay?: boolean;
  isLive?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onWaiting?: () => void;
  onCanPlay?: () => void;
  onError?: (err: string) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onVolumeChange?: (volume: number) => void;
  onQualityChange?: (level: number) => void;
};

interface PlayerMetrics {
  segmentLoadFailures: number;
  lastErrorTime: number;
  consecutiveErrors: number;
  stallCount: number;
  lastProgressTime: number;
  recoveryAttempts: number;
}

const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_RESET_INTERVAL = 3000;
const STALL_DETECTION_INTERVAL = 5000;
const STALL_THRESHOLD = 10000;
const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_COOLDOWN = 5000;

export const ClapprPlayer = forwardRef<ClapprActions, ClapprProps>(
  (
    {
      url,
      muted = false,
      autoPlay = true,
      isLive = false,
      onPlay,
      onPause,
      onEnded,
      onWaiting,
      onCanPlay,
      onError,
      onProgress,
      onVolumeChange,
      onQualityChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<any>(null);
    const isInitializingRef = useRef(false);
    const mountedRef = useRef(true);
    const metricsRef = useRef<PlayerMetrics>({
      segmentLoadFailures: 0,
      lastErrorTime: 0,
      consecutiveErrors: 0,
      stallCount: 0,
      lastProgressTime: Date.now(),
      recoveryAttempts: 0,
    });
    const stallCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);
    const lastRecoveryAttempt = useRef<number>(0);

    // Memoize HLS config to prevent unnecessary recreations
    const hlsConfig = useMemo(
      () => ({
        // Live streaming optimizations
        liveSyncDurationCount: isLive ? 3 : 1,
        liveMaxLatencyDurationCount: isLive ? 10 : Infinity,
        liveDurationInfinity: isLive,
        enableWorker: true,
        lowLatencyMode: isLive,

        // Buffer management - optimized for stability
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
        maxBufferHole: 0.5,

        // Fragment loading with exponential backoff
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 64000,

        // Manifest loading
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 64000,

        // Level loading
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 64000,

        // Performance optimizations
        startFragPrefetch: true,
        testBandwidth: true,
        progressive: false,
        autoStartLoad: true,
        startPosition: -1,

        // ABR (Adaptive Bitrate) settings
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,

        // Prevent memory leaks
        enableSoftwareAES: false,
        enableWebVTT: true,

        // Debug - disable in production
        debug: false,
      }),
      [isLive]
    );

    // Reset metrics helper
    const resetMetrics = useCallback(() => {
      metricsRef.current = {
        segmentLoadFailures: 0,
        lastErrorTime: 0,
        consecutiveErrors: 0,
        stallCount: 0,
        lastProgressTime: Date.now(),
        recoveryAttempts: 0,
      };
    }, []);

    // Enhanced error handler with categorization
    const handlePlayerError = useCallback(
      (error: any, context: string = "unknown") => {
        if (!mountedRef.current) return;

        const now = Date.now();
        const metrics = metricsRef.current;
        const timeSinceLastError = now - metrics.lastErrorTime;

        console.error(`[Clappr Error - ${context}]:`, error);

        // Track consecutive errors
        if (timeSinceLastError < ERROR_RESET_INTERVAL) {
          metrics.consecutiveErrors++;
        } else {
          metrics.consecutiveErrors = 1;
        }

        metrics.lastErrorTime = now;

        // Prevent error cascade
        if (metrics.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(
            `Critical: ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Stopping playback.`
          );
          onError?.(
            "Playback failed due to multiple errors. Please try again later."
          );
          return;
        }

        // Attempt recovery if within limits
        const timeSinceRecovery = now - lastRecoveryAttempt.current;
        if (
          metrics.recoveryAttempts < MAX_RECOVERY_ATTEMPTS &&
          timeSinceRecovery > RECOVERY_COOLDOWN
        ) {
          attemptRecovery();
        } else if (metrics.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
          onError?.("Unable to recover playback. Please reload the page.");
        } else {
          onError?.("Playback error occurred");
        }
      },
      [onError]
    );

    // Intelligent recovery mechanism
    const attemptRecovery = useCallback(() => {
      if (!playerRef.current || !mountedRef.current) return;

      const now = Date.now();
      lastRecoveryAttempt.current = now;
      metricsRef.current.recoveryAttempts++;

      console.log(
        `[Recovery] Attempt ${metricsRef.current.recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}`
      );

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();

        if (currentTime !== undefined && currentTime >= 0) {
          // Strategy: Seek slightly forward to skip problematic segment
          const seekTarget = Math.min(
            currentTime + 1,
            duration || currentTime + 1
          );

          setTimeout(() => {
            if (mountedRef.current && playerRef.current) {
              console.log(`[Recovery] Seeking to ${seekTarget.toFixed(2)}s`);
              playerRef.current.seek(seekTarget);

              setTimeout(() => {
                if (mountedRef.current && playerRef.current) {
                  playerRef.current.play();
                  metricsRef.current.lastProgressTime = Date.now();
                }
              }, 500);
            }
          }, 300);
        }
      } catch (err) {
        console.error("[Recovery] Failed:", err);
      }
    }, []);

    // Stall detection with adaptive recovery
    const checkForStalls = useCallback(() => {
      if (!mountedRef.current || !playerRef.current) return;

      try {
        const isPlaying = playerRef.current.isPlaying?.();
        const timeSinceProgress =
          Date.now() - metricsRef.current.lastProgressTime;

        if (isPlaying && timeSinceProgress > STALL_THRESHOLD) {
          metricsRef.current.stallCount++;
          console.warn(
            `[Stall Detection] Stall #${metricsRef.current.stallCount} detected (${(timeSinceProgress / 1000).toFixed(1)}s)`
          );

          const currentTime = playerRef.current.getCurrentTime();

          if (currentTime !== undefined && metricsRef.current.stallCount <= 3) {
            // Adaptive unsticking: increase seek distance with each stall
            const seekOffset = 0.1 * metricsRef.current.stallCount;
            console.log(
              `[Stall Recovery] Seeking forward by ${seekOffset.toFixed(1)}s`
            );

            playerRef.current.seek(currentTime + seekOffset);
            metricsRef.current.lastProgressTime = Date.now();
          } else if (metricsRef.current.stallCount > 3) {
            console.error(
              "[Stall Detection] Too many stalls, attempting full recovery"
            );
            attemptRecovery();
            metricsRef.current.stallCount = 0;
          }
        }
      } catch (err) {
        console.error("[Stall Detection] Error:", err);
      }
    }, [attemptRecovery]);

    // Progress tracking
    const trackProgress = useCallback(() => {
      if (!mountedRef.current || !playerRef.current) return;

      try {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();

        if (currentTime !== undefined && duration !== undefined) {
          onProgress?.(currentTime, duration);
        }
      } catch (err) {
        // Silent fail - non-critical
      }
    }, [onProgress]);

    // Expose enhanced player methods
    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          try {
            playerRef.current?.play();
          } catch (err) {
            console.error("[API] Failed to play:", err);
          }
        },
        pause: () => {
          try {
            playerRef.current?.pause();
          } catch (err) {
            console.error("[API] Failed to pause:", err);
          }
        },
        seek: (time: number) => {
          try {
            if (
              playerRef.current &&
              typeof time === "number" &&
              !isNaN(time) &&
              time >= 0
            ) {
              const duration = playerRef.current.getDuration();
              const clampedTime = duration ? Math.min(time, duration) : time;
              playerRef.current.seek(clampedTime);
            }
          } catch (err) {
            console.error("[API] Failed to seek:", err);
          }
        },
        getCurrentTime: () => {
          try {
            return playerRef.current?.getCurrentTime() ?? 0;
          } catch (err) {
            console.error("[API] Failed to get current time:", err);
            return 0;
          }
        },
        getDuration: () => {
          try {
            return playerRef.current?.getDuration() ?? 0;
          } catch (err) {
            console.error("[API] Failed to get duration:", err);
            return 0;
          }
        },
        setVolume: (volume: number) => {
          try {
            if (
              playerRef.current &&
              typeof volume === "number" &&
              volume >= 0 &&
              volume <= 100
            ) {
              playerRef.current.setVolume(volume);
            }
          } catch (err) {
            console.error("[API] Failed to set volume:", err);
          }
        },
        getVolume: () => {
          try {
            return playerRef.current?.getVolume() ?? 100;
          } catch (err) {
            console.error("[API] Failed to get volume:", err);
            return 100;
          }
        },
        isPlaying: () => {
          try {
            return playerRef.current?.isPlaying() ?? false;
          } catch (err) {
            console.error("[API] Failed to check playing state:", err);
            return false;
          }
        },
      }),
      []
    );

    // Cleanup helper
    const destroyPlayer = useCallback(() => {
      // Clear all intervals
      if (stallCheckInterval.current) {
        clearInterval(stallCheckInterval.current);
        stallCheckInterval.current = null;
      }

      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Destroy player
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.error("[Cleanup] Error destroying player:", err);
        } finally {
          playerRef.current = null;
        }
      }

      // Reset state
      resetMetrics();
      lastRecoveryAttempt.current = 0;
    }, [resetMetrics]);

    // Mount/unmount tracking
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    // Main player initialization effect
    useEffect(() => {
      if (!containerRef.current || !url) return;
      if (isInitializingRef.current) return;

      isInitializingRef.current = true;
      let playerInstance: any;

      const initPlayer = async () => {
        try {
          // Dynamic imports
          const Clappr = (await import("@clappr/player")).default;
          const { MediaControl, SpinnerThreeBouncePlugin } = await import(
            "@clappr/plugins"
          );

          // Verify still mounted
          if (!mountedRef.current || !containerRef.current) {
            isInitializingRef.current = false;
            return;
          }

          // Clean slate
          destroyPlayer();
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
          }

          // Prepare URL with cache busting for live
          const cleanUrl = isLive
            ? `${url}?_t=${Date.now()}`
            : url.split("?")[0];

          if (!cleanUrl || typeof cleanUrl !== "string") {
            throw new Error("Invalid video URL");
          }

          console.log(
            `[Init] Creating player for ${isLive ? "LIVE" : "VOD"}: ${cleanUrl}`
          );

          // Create player with production config
          playerInstance = new Clappr.Player({
            source: cleanUrl,
            parent: containerRef.current,
            width: "100%",
            height: "100%",
            autoPlay,
            mute: muted,
            plugins: [MediaControl, SpinnerThreeBouncePlugin],
            hlsjsConfig: hlsConfig,
            disableErrorScreen: true,
            playbackNotSupportedMessage:
              "Your browser does not support this video format",
          });

          // Safe callback wrapper
          const safeCallback = (cb?: () => void) => () => {
            if (mountedRef.current) {
              try {
                cb?.();
              } catch (err) {
                console.error("[Event] Callback error:", err);
              }
            }
          };

          // Bind core events
          playerInstance.on(Clappr.Events.PLAY, () => {
            metricsRef.current.lastProgressTime = Date.now();
            safeCallback(onPlay)();
          });

          playerInstance.on(Clappr.Events.PAUSE, safeCallback(onPause));
          playerInstance.on(Clappr.Events.ENDED, safeCallback(onEnded));

          playerInstance.on(Clappr.Events.ERROR, (err: any) =>
            handlePlayerError(err, "PLAYER_ERROR")
          );

          // Container state events
          const Events = Clappr.Events as any;
          if (Events.CONTAINER_STATE_BUFFERING) {
            playerInstance.on(
              Events.CONTAINER_STATE_BUFFERING,
              safeCallback(onWaiting)
            );
          }
          if (Events.CONTAINER_STATE_PLAYING) {
            playerInstance.on(
              Events.CONTAINER_STATE_PLAYING,
              safeCallback(onCanPlay)
            );
          }

          // Time update tracking
          if (Events.CONTAINER_TIMEUPDATE) {
            playerInstance.on(Events.CONTAINER_TIMEUPDATE, () => {
              metricsRef.current.lastProgressTime = Date.now();
              metricsRef.current.stallCount = 0; // Reset on successful progress
            });
          }

          // Volume change tracking
          if (Events.CONTAINER_VOLUME && onVolumeChange) {
            playerInstance.on(Events.CONTAINER_VOLUME, (volume: number) => {
              safeCallback(() => onVolumeChange(volume))();
            });
          }

          // Quality level change tracking
          if (Events.CONTAINER_BITRATE && onQualityChange) {
            playerInstance.on(Events.CONTAINER_BITRATE, (level: any) => {
              safeCallback(() => onQualityChange(level?.id ?? 0))();
            });
          }

          // Store reference
          if (mountedRef.current) {
            playerRef.current = playerInstance;
            resetMetrics();

            // Start monitoring intervals
            stallCheckInterval.current = setInterval(
              checkForStalls,
              STALL_DETECTION_INTERVAL
            );

            if (onProgress) {
              progressInterval.current = setInterval(trackProgress, 1000);
            }

            // Inject custom CSS
            if (!document.getElementById("clappr-custom-styles")) {
              const style = document.createElement("style");
              style.id = "clappr-custom-styles";
              style.textContent = `
                .clappr-player-wrapper [data-poster] .play-wrapper,
                .clappr-player-wrapper .poster-container .play-wrapper,
                .clappr-player-wrapper .spinner-three-bounce {
                  position: absolute !important;
                  top: 50% !important;
                  left: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  margin: 0 !important;
                }
                .clappr-player-wrapper .play-wrapper svg {
                  display: block !important;
                }
                .clappr-player-wrapper video {
                  object-fit: contain !important;
                }
              `;
              document.head.appendChild(style);
            }

            console.log("[Init] Player ready");
          } else {
            playerInstance.destroy();
          }
        } catch (err) {
          console.error("[Init] Failed to initialize player:", err);
          if (mountedRef.current) {
            onError?.("Failed to initialize player");
          }
        } finally {
          isInitializingRef.current = false;
        }
      };

      initPlayer();

      // Cleanup on unmount or URL change
      return () => {
        isInitializingRef.current = false;

        if (playerInstance) {
          try {
            playerInstance.destroy();
          } catch (err) {
            console.error("[Cleanup] Error:", err);
          }
        }

        destroyPlayer();

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      };
    }, [
      url,
      muted,
      autoPlay,
      isLive,
      hlsConfig,
      destroyPlayer,
      resetMetrics,
      checkForStalls,
      trackProgress,
      handlePlayerError,
      onPlay,
      onPause,
      onEnded,
      onWaiting,
      onCanPlay,
      onError,
      onProgress,
      onVolumeChange,
      onQualityChange,
    ]);

    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", position: "relative" }}
        data-testid="clappr-container"
        className="clappr-player-wrapper"
        aria-label="Video player"
      />
    );
  }
);

ClapprPlayer.displayName = "ClapprPlayer";
