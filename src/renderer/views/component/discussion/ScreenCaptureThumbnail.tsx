import { useMemo } from "react";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useDetailViewDialog } from "../common/useDetailViewDialog.jsx";

// スクリーンキャプチャのサムネイルを表示するコンポーネント

export const ScreenCaptureThumbnail = ({
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
    return <></>;
  }

  // サムネイルのクリックで該当のスクリーンキャプチャを表示
  const { detailViewDialog, renderDetailViewDialog, handleClose } =
    useDetailViewDialog();

  return (
    <div className="flex flex-col gap-1 mr-2">
      {capturedScreens.map((latestCapture, index) => (
        <div className="w-12 h-auto" key={index}>
          <img
            src={`file://${latestCapture.filePath}`}
            alt="Screen capture"
            className="w-full object-contain border border-gray-300 rounded"
            onClick={() => {
              detailViewDialog({
                content: (
                  <img
                    src={`file://${latestCapture.filePath}`}
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
        </div>
      ))}
      {renderDetailViewDialog()}
    </div>
  );
};
