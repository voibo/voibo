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
import { Add, Check, Delete, TimerOutlined } from "@mui/icons-material";
import { Button } from "@mui/material";
import { TimeField } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { HTMLProps, useEffect, useState } from "react";
import { Agenda, TimeRange, useAgendaStore } from "../store/useAgendaStore.jsx";
import { useVBStore } from "../store/useVBStore.js";
dayjs.extend(utc);
dayjs.extend(timezone);

export const DiscussedTimes = (props: { agenda: Agenda }) => {
  const { agenda } = props;
  const startTimestamp = useVBStore((state) => state.startTimestamp) ?? 0;
  const discussedTimes = useAgendaStore(
    (state) => state.getAgenda(agenda.id)?.discussedTimes
  );
  return (
    <div className="m-2">
      <div className="text-xs">Recorded times</div>
      <div className="flex flex-col mt-2">
        {(discussedTimes ?? []).map((timeRange, index) => (
          <DiscussedTime
            agenda={agenda}
            startTimestamp={startTimestamp}
            discussedTimeIndex={index}
            key={index}
          ></DiscussedTime>
        ))}
        <DiscussedTime
          startTimestamp={startTimestamp}
          agenda={agenda}
        ></DiscussedTime>
      </div>
    </div>
  );
};

const DiscussedTime = (
  props: {
    agenda: Agenda;
    startTimestamp: number;
    discussedTimeIndex?: number;
  } & HTMLProps<HTMLDivElement>
) => {
  const { agenda, startTimestamp, discussedTimeIndex, ...rest } = props;
  const [originalTime, setOriginalTime] = useState<TimeRange | undefined>();
  const [isAddStarted, setIsAddStarted] = useState(false);

  const isAdd = discussedTimeIndex === undefined;
  const isEdit =
    !isAdd &&
    agenda.discussedTimes !== undefined &&
    agenda.discussedTimes.length > discussedTimeIndex;
  const hasDiscussedTime =
    agenda.discussedTimes !== undefined && agenda.discussedTimes.length > 0;

  const [start, setStart] = useState<Dayjs | null>(null);
  const [end, setEnd] = useState<Dayjs | null>(null);
  const [updatable, setUpdatable] = useState(false);

  // useEffectを使って初期値を設定し、コンポーネントの本体での直接的な状態更新を避ける
  useEffect(() => {
    let startSeed = dayjs(0);
    let endSeed = dayjs(0);

    if (isEdit) {
      const targetTime = agenda.discussedTimes[discussedTimeIndex];
      startSeed = dayjs(targetTime.startFromMStartMsec);
      endSeed = dayjs(targetTime.endFromMStartMsec);
    } else if (hasDiscussedTime) {
      const lastDiscussedTime =
        agenda.discussedTimes[agenda.discussedTimes.length - 1];
      startSeed = dayjs(lastDiscussedTime.endFromMStartMsec);
      endSeed = dayjs(lastDiscussedTime.endFromMStartMsec);
    }

    setOriginalTime({
      startFromMStartMsec: startSeed.valueOf(),
      endFromMStartMsec: endSeed.valueOf(),
    });

    setStart(startSeed);
    setEnd(endSeed);
  }, [agenda, discussedTimeIndex, isEdit, hasDiscussedTime]);

  const validateTime = (): boolean => {
    const startUTC = start?.valueOf();
    const endUTC = end?.valueOf();
    const hasChanged =
      (startUTC !== undefined &&
        originalTime !== undefined &&
        originalTime?.startFromMStartMsec !== startUTC) ||
      (endUTC !== undefined &&
        originalTime !== undefined &&
        originalTime?.endFromMStartMsec !== endUTC);
    const validate = startUTC != null && endUTC != null && endUTC > startUTC;
    return validate && hasChanged;
  };

  const handleSetDiscussedTime = () => {
    const startUTC = start?.valueOf();
    const endUTC = end?.valueOf();

    if (validateTime()) {
      const newTimeRange: TimeRange = {
        startFromMStartMsec: startUTC!, // validated
        endFromMStartMsec: endUTC!, // validated
      };
      const newDiscussedTimes = [...(agenda.discussedTimes ?? [])];
      if (isEdit) {
        newDiscussedTimes[discussedTimeIndex] = newTimeRange;
      } else {
        newDiscussedTimes.push(newTimeRange);
      }
      useAgendaStore.getState().setAgenda({
        ...agenda,
        discussedTimes: newDiscussedTimes,
      });
      setOriginalTime(newTimeRange);
      setUpdatable(false);
    }
  };

  const handleRemoveDiscussedTime = () => {
    if (isEdit) {
      const updatedDiscussedTimes = [
        ...agenda.discussedTimes.slice(0, discussedTimeIndex),
        ...agenda.discussedTimes.slice(discussedTimeIndex + 1),
      ];
      useAgendaStore.getState().setAgenda({
        ...agenda,
        discussedTimes: updatedDiscussedTimes,
      });
    }
  };

  useEffect(() => {
    setUpdatable(validateTime());
  }, [start, end]);

  return (
    <div
      key={
        discussedTimeIndex
          ? `set_discussed_time_${discussedTimeIndex}`
          : "add_discussed_time"
      }
      className="flex items-center text-sm text-black/70 mb-2"
      {...rest}
    >
      <TimerOutlined sx={{ fontSize: "1rem" }} className="mr-2" />
      {isAdd && !isAddStarted ? (
        <Button
          variant="outlined"
          className="w-24"
          onClick={() => setIsAddStarted(true)}
        >
          <Add />
        </Button>
      ) : (
        <>
          <TimeField
            size="small"
            value={start}
            format="HH:mm:ss"
            onChange={(e) => e && setStart(e)}
            timezone="UTC"
            className="w-24"
          />
          <div className="mx-2">~</div>
          <TimeField
            size="small"
            value={end}
            format="HH:mm:ss"
            onChange={(e) => e && setEnd(e)}
            timezone="UTC"
            className="w-24"
          />
        </>
      )}
      {updatable && (
        <Button
          variant="outlined"
          onClick={handleSetDiscussedTime}
          className="ml-2 min-w-0"
        >
          <Check />
        </Button>
      )}
      <div className="ml-auto">
        {isEdit && (
          <Button
            variant="outlined"
            onClick={handleRemoveDiscussedTime}
            className="ml-2 min-w-0 border-0"
            color="error"
          >
            <Delete className="text-lg" />
          </Button>
        )}
      </div>
    </div>
  );
};
