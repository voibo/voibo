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
import { secondsToHMS } from "../../util.js";
import { DetailViewDialogState } from "../common/useDetailViewDialog.jsx";
import { useDiscussionHistory } from "../discussion/DiscussionHistory.jsx";
import { useAgendaStore } from "../store/useAgendaStore.jsx";
import { useTopicStore } from "../store/useTopicManagerStore.jsx";
import { useVFStore } from "../store/useVFStore.jsx";
import { Topic } from "./Topic.js";
import { TopicAIConfigDialog } from "./TopicAIConfigDialog.jsx";
import { useMinutesStore } from "../store/useMinutesStore.jsx";

export const TopicsElement = (props: {
  messageId: string;
  detailViewDialog: (props: DetailViewDialogState) => void;
  handleClose: () => void;
}) => {
  const { messageId, detailViewDialog, handleClose } = props;
  const minutesStore = useMinutesStore(
    useVFStore.getState().startTimestamp
  ).getState();
  const topic = minutesStore.topics.find((topic) => topic.id === messageId);

  if (!topic) return <></>;

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
    <div key={`topic-${topic.id}`} className="group relative">
      <div className="relative p-6 grid grid-cols-[2rem_1fr] gap-x-4 gap-y-4 rounded bg-white hover:cursor-pointer">
        <div className="col-span-2 flex">
          <div className="flex flex-col flex-grow">
            <div className="mb-1 flex flex-row items-center text-xs text-black/50">
              <div className="flex flex-row items-center flex-grow">
                <AccessTime sx={{ fontSize: "1rem" }} className="mr-2" />
                {topic.seedData
                  ? secondsToHMS(Math.ceil(topic.seedData.startTimestamp))
                  : "--:--:--"}
                ~
                {topic.seedData
                  ? secondsToHMS(Math.ceil(topic.seedData.endTimestamp))
                  : "--:--:--"}
              </div>
            </div>
            <div className="flex flex-row items-center space-x-1 py-2">
              {topic.classification && (
                <Chip size="small" label={topic.classification} />
              )}
              {topic.category && <Chip size="small" label={topic.category} />}
            </div>
            <div className="flex flex-row items-center">
              <div className="text-3xl">{topic.title ?? ""}</div>
              <Button className="min-w-0 min-h-0" onClick={handleClick}>
                <MoreHoriz sx={{ fontSize: "1rem" }} />
              </Button>
            </div>
          </div>
        </div>

        <div className="col-span-2 pl-4">
          <ul className="list-disc list-outside">
            {Array.isArray(topic.topic)
              ? topic.topic.map((topic, index) => <li key={index}>{topic}</li>)
              : topic.topic ?? ""}
          </ul>
        </div>
        <div className="col-span-2">
          <Actions actions={topic.actions} />
        </div>
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
  const vfState = useVFStore((state) => state);
  const vfDispatch = useVFStore((state) => state.vfDispatch);
  const updateTopicSeeds = useTopicStore((state) => state.updateTopicSeeds);

  const [openDialog, setOpenDialog] = useState(false);
  const handleClick = () => {
    vfDispatch({ type: "deleteAllTopic" });
    updateTopicSeeds(true);
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
        vfState={vfState}
        vfDispatch={vfDispatch}
      />
    </div>
  );
};

const TopicConfigDialog = (props: {
  topic: Topic;
  handleClose: () => void;
}) => {
  const { topic, handleClose } = props;

  const vfDispatch = useVFStore((state) => state.vfDispatch);
  const agendaStore = useAgendaStore((state) => state);

  const [DiscussionHistory, scrollToBadge] = useDiscussionHistory({
    behavior: "instant",
  });
  useEffect(() => {
    scrollToBadge(topic?.seedData?.startTimestamp ?? 0);
  }, [topic?.seedData?.startTimestamp]);

  return (
    <div className="flex flex-col space-y-2 text-black/60">
      <div className="flex flex-row items-center rounded p-2 border">
        <div>Topic ID</div>
        <div className="m-2 flex-grow">{topic.id ?? "No topic ID"}</div>
        <Button
          size="small"
          color="error"
          onClick={() => {
            handleClose();
            vfDispatch({
              type: "removeTopic",
              payload: { topicID: topic.id },
            });
          }}
        >
          <Delete />
        </Button>
      </div>

      <div className="flex flex-row items-center rounded p-2 border">
        <div>Start ⇒ End (sec)</div>
        <div className="m-2">
          {topic.seedData?.startTimestamp} ⇒ {topic.seedData?.endTimestamp}
        </div>
      </div>

      <div className="flex flex-row items-center rounded p-2 border">
        <div>Agenda</div>
        <div className="m-2 flex">
          {topic.seedData?.agendaIdList?.map((agendaId, index) => {
            const agenda = agendaStore.getAgenda(agendaId);
            if (agenda) {
              return (
                <div key={index}>
                  <Chip label={agenda.id}></Chip>
                  {agenda.title}
                </div>
              );
            } else {
              return <></>;
            }
          })}
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <div className="bg-amber-600 rounded w-full p-2">Discussion</div>
        {DiscussionHistory}
      </div>
    </div>
  );
};
