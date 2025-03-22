/*
Copyright 2024 Voibo

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import {
  AccessTime,
  CalendarMonthOutlined,
  Collections,
  MoreHoriz,
  Person,
  Replay,
  SmartToyOutlined,
  SummarizeOutlined,
  TaskOutlined,
} from "@mui/icons-material";
import { Button, Chip } from "@mui/material";
import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { secondsToHMS } from "../../../util.js";
import { Topic } from "../../../../common/content/topic.js";
import { DetailViewDialogState } from "../common/useDetailViewDialog.jsx";
import { useDiscussionHistory } from "../discussion/DiscussionHistory.jsx";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { TopicAIConfigDialog } from "./TopicAIConfigDialog.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processTopicAction } from "../../action/TopicAction.js";
import { ScreenCaptureThumbnail } from "../screencapture/ScreenCaptureThumbnail.jsx";
import { ScreenCapture } from "../../../../common/content/screencapture.js";

import { Add } from "@mui/icons-material";
import { Checkbox } from "@mui/material";
import { processContentAction } from "../../action/ContentAction.js";

export const TopicsElement = (props: {
  messageId: string;
  detailViewDialog: (props: DetailViewDialogState) => void;
  handleClose: () => void;
}) => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const { messageId, detailViewDialog, handleClose } = props;
  const minutesStore = useMinutesStore(startTimestamp);
  const topic = minutesStore((state) => state.topics).find(
    (topic) => topic.id === messageId
  );
  const capturedScreens = minutesStore((state) => state.capturedScreens);

  const handleClick = useCallback(() => {
    if (!topic || topic.seedData === undefined) return;

    detailViewDialog({
      content: <TopicConfigDialog topic={topic} handleClose={handleClose} />,
      dialogConf: {
        fullWidth: true,
        maxWidth: "lg",
      },
    });
  }, [topic, detailViewDialog, handleClose]);

  const handleShowTimeline = useCallback(() => {
    if (!topic || topic.seedData === undefined) return;

    const images = capturedScreens.filter(
      (screen) =>
        topic.seedData &&
        topic.seedData.startTimestamp * 1000 + startTimestamp <=
          screen.timestamp &&
        screen.timestamp < topic.seedData.endTimestamp * 1000 + startTimestamp
    );

    if (images.length > 0) {
      detailViewDialog({
        content: (
          <ScreenCaptureTimelineDialog
            images={images}
            startTimestamp={startTimestamp}
            topic={topic}
            handleClose={handleClose}
          />
        ),
        dialogConf: {
          fullWidth: true,
          maxWidth: "lg",
        },
      });
    }
  }, [capturedScreens, topic, startTimestamp, detailViewDialog, handleClose]);

  // 早期リターンはすべてのフックの後
  if (!topic || topic.seedData === undefined) return <></>;

  return (
    <div
      key={`topic-${topic.id}`}
      className="grid grid-cols-[auto_1fr] px-6 py-4 rounded bg-white hover:cursor-pointer h-full"
    >
      <ScreenCaptureTimeline
        capturedScreens={capturedScreens}
        startTimestamp={startTimestamp}
        topic={topic}
        onShowTimeline={handleShowTimeline}
      />

      <div className="flex flex-col">
        <div className="flex">
          <div className="flex flex-col flex-grow">
            <div className="flex flex-row items-center">
              <div className="text-3xl">{topic.title ?? ""}</div>
              <Button className="min-w-0 min-h-0" onClick={handleClick}>
                <MoreHoriz sx={{ fontSize: "1rem" }} />
              </Button>
            </div>

            <div className="flex flex-row items-center space-x-1 py-2">
              {topic.classification && (
                <Chip size="small" label={topic.classification} />
              )}
              {topic.category && <Chip size="small" label={topic.category} />}
            </div>
          </div>
        </div>

        <div className="pl-4 mt-4">
          <ul className="list-disc list-outside text-xl">
            {Array.isArray(topic.topic)
              ? topic.topic.map((topic, index) => (
                  <li key={index} className="mb-2">
                    {topic}
                  </li>
                ))
              : topic.topic ?? ""}
          </ul>
        </div>

        <div className="mt-4">
          <Actions actions={topic.actions} />
        </div>
      </div>
    </div>
  );
};

// ScreenCaptureTimelineコンポーネントを修正
const ScreenCaptureTimeline = memo(
  (props: {
    capturedScreens: ScreenCapture[];
    startTimestamp: number;
    topic: Topic;
    onShowTimeline?: () => void;
  }) => {
    const { topic, capturedScreens, startTimestamp, onShowTimeline } = props;

    const images = useMemo(
      () =>
        capturedScreens.filter(
          (screen) =>
            topic.seedData &&
            topic.seedData.startTimestamp * 1000 + startTimestamp <=
              screen.timestamp &&
            screen.timestamp <
              topic.seedData.endTimestamp * 1000 + startTimestamp
        ),
      [capturedScreens, topic.seedData, startTimestamp]
    );

    let firstImage = <></>;
    let middleImage = <></>;
    let lastImage = <></>;

    if (images.length > 0) {
      middleImage = (
        <div className="flex items-center justify-center text-xs text-black/50 cursor-pointer">
          <div className="flex flex-col items-center">
            <Collections className="text-2xl text-black/30" />
            <div className="text-xs mt-1">{images.length}枚</div>
          </div>
        </div>
      );

      // 画像処理コード...
      if (images.length > 1) {
        firstImage = (
          <ScreenCaptureThumbnail
            capturedScreen={images[0]}
            startTimestamp={startTimestamp}
            className="w-20 h-auto p-0 hover:cursor-pointer"
          />
        );
        lastImage = (
          <ScreenCaptureThumbnail
            capturedScreen={images[images.length - 1]}
            startTimestamp={startTimestamp}
            className="w-20 h-auto p-0 hover:cursor-pointer"
          />
        );
      } else {
        firstImage = (
          <ScreenCaptureThumbnail
            capturedScreen={images[0]}
            startTimestamp={startTimestamp}
            className="w-20 h-auto p-0 hover:cursor-pointer"
          />
        );
      }
    }

    const clock = (sec: number) => (
      <div className="flex flex-row items-center">
        <AccessTime sx={{ fontSize: "0.8rem" }} className="mr-2" />
        {topic.seedData ? secondsToHMS(Math.ceil(sec)) : "--:--:--"}
      </div>
    );

    return (
      <div className="mr-8 flex flex-col h-full" onClick={onShowTimeline}>
        <div className="flex flex-col items-center text-xs text-black/50">
          {clock(topic.seedData?.startTimestamp ?? 0)}
          <div className="border-l border-black/50 h-2"></div>
          {firstImage}
        </div>

        <div className="flex-grow flex justify-center">
          <div className="border-l border-black/50 h-full min-h-2"></div>
        </div>

        {middleImage}

        <div className="flex-grow flex justify-center">
          <div className="border-l border-black/50 h-full min-h-2"></div>
        </div>

        <div className="flex flex-col items-center text-xs text-black/50">
          {lastImage}
          <div className="border-l border-black/50 h-2"></div>
          {clock(topic.seedData?.endTimestamp ?? 0)}
        </div>
      </div>
    );
  }
);

ScreenCaptureTimeline.displayName = "ScreenCaptureTimeline";

// スクリーンキャプチャタイムラインダイアログコンポーネント
const ScreenCaptureTimelineDialog = memo(
  (props: {
    images: ScreenCapture[];
    startTimestamp: number;
    topic: Topic;
    handleClose: () => void;
  }) => {
    const { images, startTimestamp, topic, handleClose } = props;
    const [selectedIndex, setSelectedIndex] = useState(0);
    // 選択状態を管理する配列
    const [selectedImages, setSelectedImages] = useState<boolean[]>(
      Array(images.length).fill(false)
    );

    // 選択された画像の数
    const selectedCount = useMemo(() => {
      return selectedImages.filter(Boolean).length;
    }, [selectedImages]);

    // Stageに追加するためのヘルパー関数
    const addToStage = useCallback(() => {
      const imagesToAdd = images.filter((_, index) => selectedImages[index]);
      if (imagesToAdd.length === 0) return;

      processContentAction({
        type: "addCapturedImageContent",
        payload: {
          topicId: topic.id,
          frames: imagesToAdd,
        },
      });

      handleClose();
    }, [selectedImages, images, handleClose]);

    // チェックボックスの状態変更ハンドラ
    const handleCheckboxChange = (index: number) => {
      setSelectedImages((prev) => {
        const newState = [...prev];
        newState[index] = !newState[index];
        return newState;
      });
    };

    // すべて選択/選択解除する関数
    const toggleSelectAll = () => {
      const allSelected = selectedImages.every(Boolean);
      setSelectedImages(Array(images.length).fill(!allSelected));
    };

    // 前後の画像に移動するための関数
    const goToPrevious = () => {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const goToNext = () => {
      setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
    };

    // 時間を表示する関数
    const getRelativeTime = (timestamp: number) => {
      const relativeSeconds = Math.floor((timestamp - startTimestamp) / 1000);
      return secondsToHMS(relativeSeconds);
    };

    return (
      <div className="flex flex-col space-y-4 text-black/60 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {topic.title} - Screen Capture
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outlined" onClick={toggleSelectAll}>
              {selectedImages.every(Boolean) ? "Deselect all" : "Select all"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={selectedCount === 0}
              onClick={addToStage}
              startIcon={<Add />}
            >
              Add on stage ({selectedCount})
            </Button>
          </div>
        </div>

        {/* メイン画像表示エリア */}
        <div className="border rounded-lg overflow-hidden bg-gray-100 flex justify-center">
          <img
            src={`file://${images[selectedIndex]?.filePath}`}
            alt={`Screen capture at ${getRelativeTime(
              images[selectedIndex]?.timestamp
            )}`}
            className="max-h-[60vh] object-contain"
          />
        </div>

        {/* タイムスタンプと操作ボタン */}
        <div className="flex justify-between items-center">
          <Button
            variant="outlined"
            disabled={selectedIndex === 0}
            onClick={goToPrevious}
          >
            Back
          </Button>
          <div className="text-center">
            <div className="text-lg">
              {getRelativeTime(images[selectedIndex]?.timestamp)}
            </div>
            <div className="text-sm">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
          <Button
            variant="outlined"
            disabled={selectedIndex === images.length - 1}
            onClick={goToNext}
          >
            Next
          </Button>
        </div>

        {/* サムネイルタイムライン - チェックボックス付き */}
        <div className="overflow-x-auto">
          <div className="flex space-x-2 py-2 min-w-min">
            {images.map((image, index) => (
              <div
                key={image.timestamp}
                className={`flex flex-col items-center ${
                  index === selectedIndex ? "scale-110" : ""
                } ${
                  selectedImages[index]
                    ? "border-2 border-green-500"
                    : "border border-gray-300"
                } rounded p-1`}
              >
                <div className="w-full">
                  <img
                    src={`file://${image.filePath}`}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-24 h-auto object-cover cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedIndex(index)}
                  />
                </div>
                <div className="flex items-center mt-1 w-full">
                  <Checkbox
                    checked={selectedImages[index]}
                    onChange={() => handleCheckboxChange(index)}
                    size="small"
                    className="p-0 mr-1"
                  />
                  <div className="text-xs truncate">
                    {getRelativeTime(image.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ScreenCaptureTimelineDialog.displayName = "ScreenCaptureTimelineDialog";

const Actions = (props: {
  actions:
    | {
        action: string;
        responsible?: string;
        deadline?: string;
      }[]
    | undefined;
}) => {
  const { actions } = props;
  return (
    actions && (
      <div>
        {actions.map((action, index) => (
          <div key={index} className="flex flex-row mb-2">
            <TaskOutlined className="mr-2" />
            <div key={index} className="flex flex-col">
              <div className="w-full mb-2">{action.action}</div>
              <div className="flex flex-row items-center">
                {action.responsible && (
                  <div className="flex flex-row items-center">
                    <Person className="mr-2" />
                    {action.responsible}
                  </div>
                )}
                {action.deadline && (
                  <div className="ml-4 flex flex-row items-center">
                    <CalendarMonthOutlined className="mr-2" />
                    {action.deadline}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  );
};

export const TopicsHeader = () => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const updateTopicSeeds = useMinutesStore(startTimestamp)(
    (state) => state.updateTopicSeeds
  );
  const [openDialog, setOpenDialog] = useState(false);

  const handleClick = () => {
    processTopicAction({ type: "deleteAllTopic" });
    updateTopicSeeds({
      enforceUpdateAll: true,
      includeLastSeed: true,
    });
  };

  return (
    <div className="rounded p-2 bg-blue-600 text-white">
      <div className="relative flex flex-row items-start h-full">
        <div className="mt-0 flex-grow flex flex-row items-center">
          <SummarizeOutlined className="mr-2" />
          <span>Topics</span>
        </div>
        <div className="flex-0 flex flex-row items-center">
          <Button
            className="min-w-0 min-h-0 text-white"
            onClick={() => {
              setOpenDialog(true);
            }}
          >
            <SmartToyOutlined sx={{ fontSize: "1rem" }} />
          </Button>
          <Button className="min-w-0 min-h-0 text-white" onClick={handleClick}>
            <Replay sx={{ fontSize: "1rem" }} />
          </Button>
        </div>
      </div>
      <TopicAIConfigDialog
        dialogState={openDialog}
        dialogDispatch={setOpenDialog}
      />
    </div>
  );
};

const TopicConfigDialog = (props: {
  topic: Topic;
  handleClose: () => void;
}) => {
  const { topic, handleClose } = props;
  const getAgenda = useMinutesAgendaStore(
    useVBStore((state) => state.startTimestamp)
  )((state) => state.getAgenda);

  const [DiscussionHistory, scrollToBadge] = useDiscussionHistory({
    behavior: "instant",
  });
  useEffect(() => {
    scrollToBadge(topic?.seedData?.startTimestamp ?? 0);
  }, [topic?.seedData?.startTimestamp]);

  return (
    <div className="flex flex-col space-y-2 text-black/60">
      <div className="flex flex-col justify-center">
        <div className="bg-amber-600 rounded w-full p-2">Discussion</div>
        {DiscussionHistory}
      </div>
    </div>
  );
};
