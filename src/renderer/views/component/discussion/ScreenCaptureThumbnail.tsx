import { useMemo } from "react";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useDetailViewDialog } from "../common/useDetailViewDialog.jsx";
import { Tooltip } from "@mui/material";
import { secondsToHMS } from "../../../util.js";

// 単一のスクリーンキャプチャサムネイルを表示するコンポーネント
export const ScreenCaptureThumbnail = ({
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

  return (
    <>
      <div className={className}>
        <Tooltip
          title={secondsToHMS(
            (capturedScreen.timestamp - startTimestamp) / 1000
          )}
        >
          <img
            src={`file://${capturedScreen.filePath}`}
            alt="Screen capture"
            className="w-full object-contain border border-gray-300 rounded"
            onClick={() => {
              detailViewDialog({
                content: (
                  <img
                    src={`file://${capturedScreen.filePath}`}
                    alt="Screen capture"
                    className="w-full object-contain"
                  />
                ),
                onClose: handleClose,
                dialogConf: {
                  fullWidth: true,
                  maxWidth: "lg",
                },
              });
            }}
          />
        </Tooltip>
      </div>
      {renderDetailViewDialog()}
    </>
  );
};

// スクリーンキャプチャのサムネイルリストを表示するコンポーネント
export const ScreenCaptureThumbnailList = ({
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
  }, [allCapturedScreens, timestampSec, durationMSec]);

  if (capturedScreens.length === 0) {
    return (
      <div className="flex flex-col gap-1 mr-4">
        <div className="w-12 h-12 flex items-center justify-center">
          <span>&#8203;</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 mr-4">
      {capturedScreens.map((screen, index) => (
        <ScreenCaptureThumbnail
          key={index}
          capturedScreen={screen}
          startTimestamp={startTimestamp}
        />
      ))}
    </div>
  );
};
