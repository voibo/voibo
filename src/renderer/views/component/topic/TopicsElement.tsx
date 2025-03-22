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
  Delete,
  MoreHoriz,
  Person,
  Replay,
  SmartToyOutlined,
  SummarizeOutlined,
  TaskOutlined,
} from "@mui/icons-material";
import { Button, Chip } from "@mui/material";
import { useEffect, useState } from "react";
import { secondsToHMS } from "../../../util.js";
import { Topic } from "../../../../common/content/topic.js";
import { DetailViewDialogState } from "../common/useDetailViewDialog.jsx";
import { useDiscussionHistory } from "../discussion/DiscussionHistory.jsx";
import { useMinutesAgendaStore } from "../../store/useAgendaStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { TopicAIConfigDialog } from "./TopicAIConfigDialog.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processTopicAction } from "../../action/TopicAction.js";
import { ScreenCaptureThumbnail } from "../discussion/ScreenCaptureThumbnail.jsx";
import { ScreenCapture } from "../../../../common/content/screencapture.js";

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

  if (!topic || topic.seedData == undefined) return <></>;

  const handleClick = () => {
    detailViewDialog({
      content: <TopicConfigDialog topic={topic} handleClose={handleClose} />,
      dialogConf: {
        fullWidth: true,
        maxWidth: "lg",
      },
    });
  };

  return (
    <div
      key={`topic-${topic.id}`}
      className="grid grid-cols-[auto_1fr] px-6 py-4 rounded bg-white hover:cursor-pointer h-full"
    >
      <ScreenCaptureTimeline
        capturedScreens={capturedScreens}
        startTimestamp={startTimestamp}
        topic={topic}
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

const ScreenCaptureTimeline = (props: {
  capturedScreens: ScreenCapture[];
  startTimestamp: number;
  topic: Topic;
}) => {
  const { topic, capturedScreens, startTimestamp } = props;

  const images = capturedScreens.filter(
    (screen) =>
      topic.seedData &&
      topic.seedData.startTimestamp * 1000 + startTimestamp <=
        screen.timestamp &&
      screen.timestamp < topic.seedData.endTimestamp * 1000 + startTimestamp
  );

  let firstImage = <></>;
  let middleImage = <></>;
  let lastImage = <></>;
  if (images.length > 0) {
    middleImage = (
      <div className="flex items-center justify-center text-xs text-black/50">
        <Collections className="text-2xl text-black/30" />
      </div>
    );
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
    <div className="mr-8 flex flex-col h-full">
      <div className="flex flex-col items-center text-xs text-black/50">
        {clock(topic.seedData?.startTimestamp ?? 0)}
        <div className="border-l border-black/50 h-4"></div>
        {firstImage}
      </div>

      <div className="flex-grow flex justify-center">
        <div className="border-l border-black/50 h-full"></div>
      </div>

      {middleImage}

      <div className="flex-grow flex justify-center">
        <div className="border-l border-black/50 h-full"></div>
      </div>

      <div className="flex flex-col items-center text-xs text-black/50">
        {lastImage}
        <div className="border-l border-black/50 h-4"></div>
        {clock(topic.seedData?.endTimestamp ?? 0)}
      </div>
    </div>
  );
};

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
