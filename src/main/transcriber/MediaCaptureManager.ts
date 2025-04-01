import fs from "fs";
import path from "path";
import {
  MediaCapture,
  MediaCaptureConfig,
  MediaCaptureQuality,
  MediaCaptureTarget,
  MediaCaptureTargetType,
  MediaCaptureVideoFrame,
} from "@voibo/desktop-media-capture";
import {
  IPCInvokeKeys,
  IPCReceiverKeys,
  IPCSenderKeys,
} from "../../common/constants.js";
import { ScreenCapture } from "../../common/content/screencapture.js";

export class MediaCaptureManager {
  static async enumerateMediaCaptureTargets(
    type?: MediaCaptureTargetType
  ): Promise<MediaCaptureTarget[]> {
    if (!type) {
      type = MediaCaptureTargetType.Screen;
    }
    return MediaCapture.enumerateMediaCaptureTargets(type);
  }

  private _ipcMain: Electron.IpcMain;
  private _webContents: Electron.WebContents;
  private _capture: MediaCapture;

  private _desktopAudioBuffer: number[] = new Array(0);
  private _rawAudioFileStream: fs.WriteStream | null = null;

  private _minutesFolderPath: string;
  private _imagePath: string;

  private _capturingIsDisplay: boolean;
  private _capturingID: number | null; // window ID or display ID

  constructor({
    ipcMain,
    webContents,
    desktopAudioBuffer,
    minutesFolderPath,
    similarityThreshold,
  }: {
    ipcMain: Electron.IpcMain;
    webContents: Electron.WebContents;
    desktopAudioBuffer: number[];
    minutesFolderPath: string;
    similarityThreshold?: number;
  }) {
    this._ipcMain = ipcMain;
    this._webContents = webContents;
    this._desktopAudioBuffer = desktopAudioBuffer;
    this._minutesFolderPath = minutesFolderPath;
    this._imagePath = this._minutesFolderPath;
    this._capturingID = null;
    this._capturingIsDisplay = true;

    // initialize MediaCapture
    this._capture = new MediaCapture();

    this._capture.on("error", (error: any) => {
      console.error(error);
    });

    // audio
    this._capture.on("audio-data", (data: any) => {
      const float32Array = new Float32Array(data);
      this._desktopAudioBuffer.push(...float32Array);

      // save raw audio data on file
      if (this._rawAudioFileStream) {
        try {
          this._rawAudioFileStream.write(Buffer.from(float32Array.buffer));
        } catch (e) {
          this._rawAudioFileStream = null;
          console.error(e);
        }
      }
    });

    // screen capture
    this._capture.on("video-frame", async (frame: MediaCaptureVideoFrame) => {
      if (frame.isJpeg) {
        const frameBuffer = Buffer.from(frame.data);
        try {
          // save image
          const filePath = path.join(this._imagePath, `${frame.timestamp}.jpg`);
          fs.writeFileSync(filePath, frameBuffer);

          // send image data to renderer
          const screenCapture: ScreenCapture = {
            timestamp: frame.timestamp,
            width: frame.width,
            height: frame.height,
            filePath: filePath,
          };
          this._webContents.send(
            IPCReceiverKeys.ON_SCREEN_CAPTURED,
            screenCapture
          );
        } catch (e) {
          console.error("Error processing video frame:", e);
        }
      }
    });

    // screen capture target selected
    this._ipcMain.removeHandler(IPCInvokeKeys.SCREEN_CAPTURE_TARGET_SELECTED);
    this._ipcMain.handle(
      IPCInvokeKeys.SCREEN_CAPTURE_TARGET_SELECTED,
      async (e, isDisplay: boolean, selectedId: number): Promise<boolean> => {
        this._capturingIsDisplay = isDisplay;
        this._capturingID = selectedId;
        return true;
      }
    );

    // screen capture target list
    this._ipcMain.removeHandler(IPCInvokeKeys.ENUM_MEDIA_CAPTURE_TARGETS);
    this._ipcMain.handle(
      IPCInvokeKeys.ENUM_MEDIA_CAPTURE_TARGETS,
      async (): Promise<MediaCaptureTarget[]> => {
        const result: MediaCaptureTarget[] = [];
        result.push(
          ...(await MediaCaptureManager.enumerateMediaCaptureTargets(
            MediaCaptureTargetType.Screen
          ))
        );
        result.push(
          ...(
            await MediaCaptureManager.enumerateMediaCaptureTargets(
              MediaCaptureTargetType.Window
            )
          ).filter((target) => target.applicationName && target.title)
        );
        return result;
      }
    );
  }

  public startCapture({ currentTimestamp }: { currentTimestamp: number }) {
    if (this._capturingID === null) {
      console.error("No capturing target selected");
      return;
    }

    // make folder for raw audio data
    const audioPath = path.join(
      this._minutesFolderPath,
      currentTimestamp.toString(),
      "audio"
    );
    try {
      if (!fs.existsSync(audioPath)) {
        fs.mkdirSync(audioPath, { recursive: true });
      }
      this._rawAudioFileStream = fs.createWriteStream(
        path.join(audioPath, "raw_pcm.f32")
      );
    } catch (e) {
      this._rawAudioFileStream = null;
      console.error(e);
      console.error("failed to create audio folder");
    }

    // image folder
    this._imagePath = path.join(
      this._minutesFolderPath,
      currentTimestamp.toString(),
      "image"
    );
    try {
      if (!fs.existsSync(this._imagePath)) {
        fs.mkdirSync(this._imagePath, { recursive: true });
      }
    } catch (e) {
      console.error(e);
      console.error("failed to create image folder");
    }

    // start
    const config: MediaCaptureConfig = {
      displayId: undefined,
      windowId: undefined,
      audioChannels: 1, // mono
      audioSampleRate: 16000, // 16kHz
      frameRate: 0.2, // 1 frame per 5 second
      quality: MediaCaptureQuality.High,
      isElectron: true,
    };
    if (this._capturingIsDisplay) {
      config.displayId = this._capturingID;
    } else {
      config.windowId = this._capturingID;
    }
    this._capture.startCapture(config);
  }

  public stopCapture() {
    this._capture.stopCapture();

    if (this._rawAudioFileStream) {
      this._rawAudioFileStream.end();
      this._rawAudioFileStream = null;
    }
  }
}
