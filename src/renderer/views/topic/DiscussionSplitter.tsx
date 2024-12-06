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
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { DiscussionSegment } from "../discussion/DiscussionSegment.jsx";
import { VFAction, VFState } from "../store/useVFStore.jsx";

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

export const DiscussionSplitter = ({
  vfState,
  vfDispatch,
}: {
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    console.log(
      "vfState.discussionSplitter changed:",
      vfState.discussionSplitter
    );
  }, [vfState.discussionSplitter]);

  return (
    <div className="flex flex-row items-center">
      <Button
        className="normal-case min-h-0 min-w-0 p-0 text-white"
        onClick={() => {
          setOpen(true);
        }}
      >
        <TimerOutlined sx={{ fontSize: "1rem" }} className="mr-2" />
        {vfState.discussionSplitter.name}
      </Button>
      <DiscussionSplitterDialog
        open={open}
        setOpen={setOpen}
        vfState={vfState}
        vfDispatch={vfDispatch}
      />
    </div>
  );
};

const DiscussionSplitterDialog = (props: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
}) => {
  const { open, setOpen, vfState, vfDispatch } = props;

  const handleChange = (e: SelectChangeEvent) => {
    const selected = SplitterConfigList.filter(
      (config) => String(config.duration) === e.target.value
    )[0];
    vfDispatch({
      type: "changeDiscussionSplitterConf",
      payload: {
        splitterConf: { ...selected }, // 新オブジェクトにするため
      },
    });
    setOpen(false);
  };

  const handleSplit = () => {
    const duration = vfState.discussionSplitter.duration;
    if (duration === 0) return;

    let lastStartTimestamp = 0;
    vfDispatch({
      type: "setMinutesLines",
      payload: {
        minutes: vfState.discussion.map((v, index) => {
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
                  value={String(vfState.discussionSplitter.duration)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 *
 * @param minutes
 * @param duration 0 for manual split
 * @returns
 */
export function splitMinutes(
  minutes: DiscussionSegment[],
  duration: number
): {
  minutes: DiscussionSegment[];
  hasNewStartPoint: boolean;
} {
  let hasNewStartPoint = false;
  if (duration === 0) return { minutes, hasNewStartPoint };
  // メインケース
  let lastStartTimestamp = 0;
  const newMinutes = minutes.map((v, index) => {
    if (index === 0) {
      // 強制的に最初のトピックは開始点にする
      // この場合は新しく開始点が設定されたとはみなさない
      lastStartTimestamp = Number(v.timestamp);
      return { ...v, topicStartedPoint: true };
    } else if (v.topicStartedPoint) {
      // 設定済みの開始点はそのまま
      lastStartTimestamp = Number(v.timestamp);
      return v;
    } else if (Number(v.timestamp) - lastStartTimestamp > duration) {
      // 設定された時間を超えたら開始点にする
      lastStartTimestamp = Number(v.timestamp);
      hasNewStartPoint = true; // 新しく開始点が設定された
      return { ...v, topicStartedPoint: true };
    } else {
      return { ...v, topicStartedPoint: false };
    }
  });
  return { minutes: newMinutes, hasNewStartPoint };
}
