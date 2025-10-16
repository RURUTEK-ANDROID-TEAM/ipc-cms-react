// Type declarations for Clappr Player and its plugins
// Version: 0.4.x

//
// @clappr/player
// --------------------------------------------------
declare module "@clappr/player" {
  /**
   * Base class for all Clappr objects that emit events.
   */
  export class EventHandler {
    on(event: string, callback: (...args: any[]) => void, context?: any): this;
    once(
      event: string,
      callback: (...args: any[]) => void,
      context?: any
    ): this;
    off(
      event: string,
      callback?: (...args: any[]) => void,
      context?: any
    ): this;
    trigger(event: string, ...args: any[]): this;
    listenTo(
      obj: EventHandler,
      event: string,
      callback: (...args: any[]) => void
    ): this;
    stopListening(
      obj?: EventHandler,
      event?: string,
      callback?: (...args: any[]) => void
    ): this;
  }

  export type ClapprSource =
    | string
    | { source: string; mimeType?: string; name?: string };

  export interface PosterOptions {
    /** Whether to show the play button on the poster. Defaults to `true`. */
    playButton?: boolean;
    /** A custom image URL for the poster. Defaults to the frame at second 0. */
    imageUrl?: string;
  }

  export interface MediaControlOptions {
    /** HEX color for the seek bar. */
    seekbar?: string;
    /** HEX color for the control buttons. */
    buttons?: string;
    /** Whether the media control should disappear after a few seconds. */
    autoHide?: boolean;
    /** A list of dictionaries with settings for custom buttons. */
    buttonsToDisable?: string[];
  }

  export interface ClapprPlayerOptions {
    /** The video source URL. */
    source?: ClapprSource;
    /** An array of sources to be used. */
    sources?: ClapprSource[];
    /** The DOM element or selector where the player should be rendered. */
    parent?: string | HTMLElement;
    /** Poster configuration. */
    poster?: string | PosterOptions;
    /** Player height. */
    height?: number | string;
    /** Player width. */
    width?: number | string;
    /** Automatically start playing the video. */
    autoPlay?: boolean;
    /** Start the video in a muted state. */
    mute?: boolean;
    /** Restart the video automatically when it ends. */
    loop?: boolean;
    /** The preload attribute for the video tag. */
    preload?: "none" | "metadata" | "auto";
    /** Disable the context menu on the video element. */
    disableVideoTagContextMenu?: boolean;
    /** A message to be displayed when playback is not supported. */
    playbackNotSupportedMessage?: string;
    /** Media control configuration. */
    mediacontrol?: MediaControlOptions;
    /** A URL for a watermark image to be displayed. */
    watermark?: string;
    /** Position for the watermark. */
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    /** An object with event-name keys and callback-function values. */
    events?: Record<string, (...args: any[]) => void>;
    /** An array of plugin instances or classes. */
    plugins?: any[];
    /** If `true`, the player is rendered without any UI. */
    chromeless?: boolean;
    /** Configuration object for hls.js. */
    hlsjsConfig?: Record<string, any>;
    /** If `true`, the default error screen is disabled. */
    disableErrorScreen?: boolean;
    /** If `true`, the user can't pause the video by clicking on the container. */
    clickToPause?: boolean;
  }

  export interface ClapprError {
    code: string;
    description: string;
    level: "warn" | "error";
    origin: string;
    scope: string;
    raw: any;
  }

  export interface ClapprPlayerEventMap {
    READY: "ready";
    RESIZE: "resize";
    PLAY: "play";
    PAUSE: "pause";
    STOP: "stop";
    ENDED: "ended";
    SEEK: "seek";
    ERROR: "error";
    TIMEUPDATE: "timeupdate";
    VOLUMEUPDATE: "volumeupdate";
    SUBTITLE_AVAILABLE: "subtitleavailable";
    SUBTITLE_CHANGED: "subtitlechanged";

    // Container Events
    CONTAINER_STATE_BUFFERING: "container:state:buffering";
    CONTAINER_STATE_BUFFERFULL: "container:state:bufferfull";
    CONTAINER_STATE_PLAYING: "container:state:playing";
    CONTAINER_STATE_PAUSED: "container:state:paused";
    CONTAINER_STATE_STOPPED: "container:state:stopped";
    CONTAINER_STATE_ENDED: "container:state:ended";
    CONTAINER_STATE_ERROR: "container:state:error";

    // MediaControl Events
    MEDIACONTROL_SHOW: "mediacontrol:show";
    MEDIACONTROL_HIDE: "mediacontrol:hide";
  }

  export class Player extends EventHandler {
    constructor(options: ClapprPlayerOptions);
    attachTo(element: HTMLElement | string): void;
    destroy(): void;
    load(source: ClapprSource, mimeType?: string): void;
    play(): void;
    pause(): void;
    stop(): void;
    seek(time: number): void;
    seekPercentage(percentage: number): void;
    mute(): void;
    unmute(): void;
    setVolume(volume: number): void; // 0-100
    getCurrentTime(): number;
    getDuration(): number;
    isPlaying(): boolean;
    isMuted(): boolean;
    getVolume(): number;
    getContainer(): HTMLElement | undefined;

    // Event handling with improved type safety
    on(event: "ready", callback: () => void): this;
    on(event: "play" | "pause" | "stop" | "ended", callback: () => void): this;
    on(
      event: "timeupdate",
      callback: (time: { current: number; total: number }) => void
    ): this;
    on(event: "error", callback: (error: ClapprError) => void): this;
    on(
      event: "resize",
      callback: (size: { width: number; height: number }) => void
    ): this;
    on(
      event: "volumeupdate",
      callback: (volume: { volume: number; muted: boolean }) => void
    ): this;
    on(event: string, callback: (...args: any[]) => void): this; // Fallback

    static Events: ClapprPlayerEventMap;
  }

  const Clappr: {
    Player: typeof Player;
    Events: ClapprPlayerEventMap;
    EventHandler: typeof EventHandler;
  };

  export default Clappr;
}

//
// @clappr/plugins
// --------------------------------------------------
declare module "@clappr/plugins" {
  import { EventHandler, Player } from "@clappr/player";

  // Base Plugin Classes
  export class CorePlugin extends EventHandler {
    name: string;
    core: Player;
  }

  export class UICorePlugin extends CorePlugin {
    render(): this;
    destroy(): void;
    enable(): void;
    disable(): void;
  }

  export class UIContainerPlugin extends EventHandler {
    name: string;
    container: any; // Clappr's container object
  }

  // Specific Plugins
  export class SpinnerThreeBouncePlugin extends UIContainerPlugin {}
  export class PosterPlugin extends UIContainerPlugin {}

  // MediaControl is a namespace containing multiple UI plugins
  export namespace MediaControl {
    export class MainPlugin extends UIContainerPlugin {}
    export class PlayPauseButtonPlugin extends UICorePlugin {}
    export class VolumePlugin extends UICorePlugin {}
    export class FullscreenButtonPlugin extends UICorePlugin {}
    export class SeekBarPlugin extends UIContainerPlugin {}
    export class TimeIndicatorPlugin extends UICorePlugin {}
  }
}
