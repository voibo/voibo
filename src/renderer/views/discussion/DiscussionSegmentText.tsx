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
  Check,
  Delete,
  VerticalAlignBottom,
  VerticalAlignTop,
} from "@mui/icons-material";
import { Button, Tooltip } from "@mui/material";
import { Fragment, useEffect, useState } from "react";
import { secondsToHMS } from "../../util.js";
import { useVBStore } from "../store/useVBStore.jsx";

export const DiscussionSegmentText = (props: {
  segmentIndex: number;
  segmentTextIndex: number;
  text?: string;
  timestamp?: string | number;
  length?: string | number;
  audioFilePath: string;
  offsetSeconds?: number;
}) => {
  //console.log("EditableSpan", text, timestamp, audioID, offsetSeconds);
  const {
    segmentIndex,
    segmentTextIndex,
    text,
    timestamp,
    length,
    audioFilePath,
    offsetSeconds,
    ...others
  } = props;

  const vfState = useVBStore((state) => state);
  const vfDispatch = useVBStore((state) => state.vfDispatch);
  const [editing, setEditing] = useState(false);
  const [currentText, setCurrentText] = useState(text ?? "");
  const currentStartTimestamp = Math.round(Number(timestamp));
  const currentStartAt = secondsToHMS(currentStartTimestamp) ?? "";
  const currentEndAt =
    secondsToHMS(Math.round(currentStartTimestamp + Number(length) / 1000)) ??
    "";

  const audioPlay = (audioID: string) => {
    const audio = document.getElementById("globalAudio") as HTMLAudioElement;
    const srcStartAt = offsetSeconds ?? 0;
    const srcEndAt = srcStartAt + Number(length) / 1000;
    if (audio) {
      audio.src = `${audioID}#t=${srcStartAt},${srcEndAt}`;
      //console.log("audioControl:audio.src", audio.src);
      audio.muted = vfState.playWavMute;
      audio.play();
    }
  };

  useEffect(() => {
    setCurrentText(text ?? "");
  }, [text]);

  return editing ? (
    <div className="w-full" {...others}>
      <div className="grid grid-cols-12">
        <Tooltip title="Merge up to this point into the previous speaker segment">
          <Button
            size="small"
            className="col-span-12"
            onClick={(e) => {
              setEditing(false);
              vfDispatch({
                type: "mergeUpMinutesText",
                payload: {
                  segmentIndex,
                  segmentTextIndex,
                },
              });
            }}
          >
            <VerticalAlignTop />
            MERGE
          </Button>
        </Tooltip>

        <Button
          className="col-span-1 min-w-0"
          color="error"
          onClick={(e) => {
            console.log("input:onBlur", currentText);
            // todo save
            setEditing(false);
            vfDispatch({
              type: "removeMinutesText",
              payload: {
                segmentIndex,
                segmentTextIndex,
              },
            });
          }}
        >
          <Delete />
        </Button>
        <textarea
          className="col-span-10 p-2 border border-zinc-300"
          autoFocus={true}
          value={currentText}
          onChange={(e) => {
            setCurrentText(e.target.value);
          }}
        />
        <Button
          className="col-span-1 min-w-0"
          onClick={(e) => {
            setEditing(false);
            vfDispatch({
              type: "updateMinutesText",
              payload: {
                segmentIndex,
                segmentTextIndex,
                content: currentText,
              },
            });
          }}
        >
          <Check />
        </Button>

        <Tooltip title="Split to new speaker segment from this point">
          <Button
            size="small"
            className="col-span-12"
            onClick={(e) => {
              setEditing(false);
              vfDispatch({
                type: "splitMinutesText",
                payload: {
                  segmentIndex,
                  segmentTextIndex,
                },
              });
            }}
          >
            <VerticalAlignBottom />
            SPLIT
          </Button>
        </Tooltip>
      </div>
    </div>
  ) : (
    <span {...others}>
      <Tooltip placement="top" title={`${currentStartAt} - ${currentEndAt}`}>
        <span>
          {splitWithTerminalSymbol(currentText).map((data, index) => {
            return (
              <Fragment key={index}>
                <span
                  className="hover:border-b-2 border-blue-500"
                  onClick={(e) => {
                    switch (e.detail) {
                      case 1:
                        audioPlay(audioFilePath);
                        break;
                      case 2:
                        setEditing(true);
                        break;
                    }
                  }}
                >
                  {data.text}
                </span>
                {data.isTerminal && (
                  <>
                    <br />
                    <span className="block mb-2"></span>
                  </>
                )}
              </Fragment>
            );
          })}
        </span>
      </Tooltip>
    </span>
  );
};

function splitWithTerminalSymbol(text: string): Array<{
  text: string;
  isTerminal: boolean;
}> {
  return text
    .split(/(?<=[。！？\!?])/) // 終了記号（句点・感嘆符・疑問符）で文字列を分割
    .filter((sentence) => sentence.length > 0) // 空文字列をフィルタリング
    .map((sentence, index, array) => {
      const isTerminal = index < array.length - 1;
      if (/(?<=[。！？\!?])/.test(sentence)) {
        return { text: sentence, isTerminal: true };
      } else {
        return { text: sentence, isTerminal: false };
      }
    });
}
