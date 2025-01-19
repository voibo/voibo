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
import { TimerOutlined } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogContent,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { Dispatch, SetStateAction, useState } from "react";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processDiscussionAction } from "../../action/DiscussionAction.js";
import { processDiscussionSplitterConfAction } from "../../action/DiscussionSplitterConfAction.js";

const SplitterConfigList: Array<DiscussionSplitterConf> = [
  {
    name: "Manual",
    duration: 0,
  },
  {
    name: "15 sec",
    duration: 15,
  },
  {
    name: "30 sec",
    duration: 30,
  },
  {
    name: "1 min",
    duration: 60 * 1,
  },
  {
    name: "3 min",
    duration: 60 * 3,
  },
  {
    name: "5 min",
    duration: 60 * 5,
  },
  {
    name: "10 min",
    duration: 60 * 10,
  },
  {
    name: "15 min",
    duration: 60 * 15,
  },
];

export const DefaultSplitter: DiscussionSplitterConf = SplitterConfigList[2];

export type DiscussionSplitterConf = {
  name: string;
  duration: number;
};

export const DiscussionSplitter = () => {
  const [open, setOpen] = useState(false);
  const discussionSplitterName = useMinutesStore(
    useVBStore.getState().startTimestamp
  )((state) => state.discussionSplitter.name);

  return (
    <div className="flex flex-row items-center">
      <Button
        className="normal-case min-h-0 min-w-0 p-0 text-white"
        onClick={() => {
          setOpen(true);
        }}
      >
        <TimerOutlined sx={{ fontSize: "1rem" }} className="mr-2" />
        {discussionSplitterName}
      </Button>
      <DiscussionSplitterDialog open={open} setOpen={setOpen} />
    </div>
  );
};

const DiscussionSplitterDialog = (props: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const { open, setOpen } = props;
  const minutesStore = useMinutesStore(
    useVBStore((state) => state.startTimestamp)
  );
  const discussionSplitter = minutesStore((state) => state.discussionSplitter);
  const discussion = minutesStore((state) => state.discussion);

  const handleChange = (e: SelectChangeEvent) => {
    const selected = SplitterConfigList.filter(
      (config) => String(config.duration) === e.target.value
    )[0];
    processDiscussionSplitterConfAction({
      type: "changeDiscussionSplitterConf",
      payload: {
        splitterConf: { ...selected }, // 新オブジェクトにするため
      },
    });
    setOpen(false);
  };

  const handleSplit = () => {
    const duration = discussionSplitter.duration;
    if (duration === 0) return;

    let lastStartTimestamp = 0;
    processDiscussionAction({
      type: "setMinutesLines",
      payload: {
        minutes: discussion.map((v, index) => {
          if (index === 0) {
            lastStartTimestamp = Number(v.timestamp);
            return { ...v, topicStartedPoint: true };
          } else if (Number(v.timestamp) - lastStartTimestamp > duration) {
            lastStartTimestamp = Number(v.timestamp);
            return { ...v, topicStartedPoint: true };
          } else {
            return { ...v, topicStartedPoint: false };
          }
        }),
      },
    });
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        <div className="flex flex-col items-center">
          <div className="mb-4 w-full text-lg">Split Discussion</div>
          <div className="flex flex-row items-center w-full my-4 mb-4">
            <div className="flex-0 mr-4">Split mode</div>
            <div className="flex-1">
              <FormControl fullWidth>
                <Select
                  value={String(discussionSplitter.duration)}
                  label=""
                  onChange={handleChange}
                >
                  {SplitterConfigList.map((config, index) => {
                    return (
                      <MenuItem key={index} value={String(config.duration)}>
                        {config.name}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </div>
          </div>
          {/*
          <div className="border rounded my-4 p-4">
            <div className="w-full mb-2 text-sm">
              Enforce splitting current discussion with the setting.
            </div>
            <Button
              variant="outlined"
              color="error"
              className="normal-case w-full"
              onClick={handleSplit}
            >
              Split
            </Button>
          </div>
           */}
        </div>
      </DialogContent>
    </Dialog>
  );
};
