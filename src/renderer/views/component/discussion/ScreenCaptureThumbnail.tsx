import { useMemo, useCallback, memo } from "react";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useDetailViewDialog } from "../common/useDetailViewDialog.jsx";
import { Tooltip } from "@mui/material";
import { secondsToHMS } from "../../../util.js";

// 単一のスクリーンキャプチャサムネイルを表示するコンポーネント
export const ScreenCaptureThumbnail = memo(
  ({
    capturedScreen,
    startTimestamp,
    className = "w-12 h-auto",
  }: {
    capturedScreen: { timestamp: number; filePath: string };
    startTimestamp: number;
    className?: string;
  }) => {
    // サムネイルのクリックで該当のスクリーンキャプチャを表示
    const { detailViewDialog, renderDetailViewDialog, handleClose } =
      useDetailViewDialog();

    // ダイアログの内容をメモ化
    const dialogContent = useMemo(
      () => (
        <img
          src={`file://${capturedScreen.filePath}`}
          alt="Screen capture"
          className="w-full object-contain"
        />
      ),
      [capturedScreen.filePath]
    );

    // クリックハンドラをメモ化
    const handleClick = useCallback(() => {
      detailViewDialog({
        content: dialogContent,
        onClose: handleClose,
        dialogConf: {
          fullWidth: true,
          maxWidth: "lg",
        },
      });
    }, [dialogContent, detailViewDialog, handleClose]);

    // 時間表示をメモ化
    const timeDisplay = useMemo(
      () => secondsToHMS((capturedScreen.timestamp - startTimestamp) / 1000),
      [capturedScreen.timestamp, startTimestamp]
    );

    return (
      <>
        <div className={className}>
          <Tooltip title={timeDisplay}>
            <img
              src={`file://${capturedScreen.filePath}`}
              alt="Screen capture"
              className="w-full object-contain border border-gray-300 rounded"
              onClick={handleClick}
            />
          </Tooltip>
        </div>
        {renderDetailViewDialog()}
      </>
    );
  }
);

// メモ化のためにdisplayNameを設定
ScreenCaptureThumbnail.displayName = "ScreenCaptureThumbnail";

// スクリーンキャプチャのサムネイルリストを表示するコンポーネント
export const ScreenCaptureThumbnailList = memo(
  ({
    timestampSec,
    durationMSec,
  }: {
    timestampSec: number;
    durationMSec: number;
  }) => {
    const startTimestamp = useVBStore((state) => state.startTimestamp);

    // 先にキャプチャスクリーンの配列全体を取得
    const allCapturedScreens = useMinutesStore(startTimestamp)(
      (state) => state.capturedScreens
    );

    // useMemoを使用してフィルタリング結果をメモ化
    const capturedScreens = useMemo(() => {
      return allCapturedScreens.filter((screen) => {
        const currentMSec = startTimestamp + timestampSec * 1000;
        return (
          screen.timestamp >= currentMSec &&
          screen.timestamp < currentMSec + durationMSec
        );
      });
    }, [allCapturedScreens, timestampSec, durationMSec, startTimestamp]);

    // 空の場合の表示をメモ化
    const emptyView = useMemo(
      () => (
        <div className="flex flex-col gap-1 mr-4">
          <div className="w-12 h-12 flex items-center justify-center">
            <span>&#8203;</span>
          </div>
        </div>
      ),
      []
    );

    if (capturedScreens.length === 0) {
      return emptyView;
    }

    return (
      <div className="flex flex-col gap-1 mr-4">
        {capturedScreens.map((screen, index) => (
          <ScreenCaptureThumbnail
            key={screen.timestamp}
            capturedScreen={screen}
            startTimestamp={startTimestamp}
          />
        ))}
      </div>
    );
  }
);

// メモ化のためにdisplayNameを設定
ScreenCaptureThumbnailList.displayName = "ScreenCaptureThumbnailList";
