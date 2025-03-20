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
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { Bookmark } from "@mui/icons-material";
import { Avatar, Badge } from "@mui/material";
import { DiscussionSegment } from "../../../../common/discussion.jsx";
import { DiscussionSegmentText } from "./DiscussionSegmentText.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processDiscussionAction } from "../../action/DiscussionAction.js";
import { ScreenCaptureThumbnailList } from "./ScreenCaptureThumbnail.jsx";

export const useDiscussionHistory = (
  option: ScrollIntoViewOptions = { behavior: "smooth" }
): [ReactNode, (startTime: number) => void] => {
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const audioFolder = useVBStore((state) => state.audioFolder);
  const interimSegment = useVBStore((state) => state.interimSegment);

  const minutesStore = useMinutesStore(startTimestamp);
  const currentDiscussion = minutesStore((state) => state.discussion);

  // scroll to bottom
  const endOfMinutesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // scroll
    if (endOfMinutesRef.current) {
      endOfMinutesRef.current.scrollIntoView(option);
    }
  }, [currentDiscussion]);

  // scroll to all badges
  const badgesRef = useRef<{
    [key in string]: HTMLDivElement;
  }>({});

  const discussion = useMemo(
    () =>
      currentDiscussion.map((v) => ({
        id: v.timestamp.toString(),
        refCallbackFunction: (node: HTMLDivElement | null) => {
          if (
            node !== null &&
            badgesRef.current[v.timestamp.toString()] === undefined
          ) {
            // node が null でなく、かつ、ref が未登録の場合
            badgesRef.current[v.timestamp] = node;
          } else {
            // node が null の場合は、対象の node を管理する必要がなくなるため削除
            delete badgesRef.current[v.timestamp.toString()];
          }
        },
        segment: v,
      })),
    [currentDiscussion]
  );

  const scrollToBadge = useCallback((startTimestamp: number) => {
    const itemRef = badgesRef.current[startTimestamp.toString()];
    itemRef?.scrollIntoView(option);
  }, []);

  return [
    <div className="flex flex-row items-center bg-amber-600 rounded border border-amber-600">
      <div className="flex flex-col">
        <div
          className="p-4 w-full h-40 min-w-[600px] overflow-y-scroll bg-amber-50 border border-t-0 rounded-b border-amber-300"
          id="left"
        >
          {discussion.map((value, index) => {
            return (
              <div
                className={`flex flex-row ${
                  value.segment.topicStartedPoint &&
                  "pt-2 border-t-4 border-double border-emerald-400"
                }`}
                key={`${index}`}
              >
                <div className="mr-2 flex">
                  <div
                    className="h-full flex flex-col items-center"
                    ref={value.refCallbackFunction}
                  >
                    <TopicBadge index={index} segment={value.segment} />
                    <div className="border-l-2 border-zinc-300 h-full text-sm">
                      &nbsp;
                    </div>
                  </div>
                </div>
                <div className="px-2 pb-2">
                  {(value.segment.texts ?? []).map((text, xIndex) => {
                    return (
                      <div
                        key={`${index}_${xIndex}`}
                        className="w-full flex flex-row"
                      >
                        <ScreenCaptureThumbnailList
                          timestampSec={Number(text.timestamp)}
                          durationMSec={Number(text.length)}
                        />
                        <DiscussionSegmentText
                          key={`${index}_${xIndex}`}
                          segmentIndex={index}
                          segmentTextIndex={xIndex}
                          text={text.text}
                          timestamp={text.timestamp}
                          length={text.length}
                          audioFilePath={`${audioFolder}${startTimestamp}/${text.audioSrc}`}
                          offsetSeconds={text.audioOffset}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* interimSegment */}
          {interimSegment && (
            <div
              className={`flex flex-row `}
              key={`${(discussion ?? []).length}`}
            >
              <div className="mr-2 flex">
                <div className="h-full flex flex-col items-center">
                  <div>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      className={
                        "p-1 hover:cursor-pointer hover:rounded-full hover:bg-emerald-400/30"
                      }
                    >
                      <Avatar className={`h-8 w-8`}>
                        <span className="text-xs">
                          {`${(discussion ?? []).length}`}
                        </span>
                      </Avatar>
                    </Badge>
                  </div>
                  <div className="border-l-2 border-zinc-300 h-full text-sm">
                    &nbsp;
                  </div>
                </div>
              </div>
              <div className="px-2 pb-2">
                <DiscussionSegmentText
                  segmentIndex={(discussion ?? []).length}
                  segmentTextIndex={-1}
                  text={
                    interimSegment.texts ? interimSegment.texts[0].text : ""
                  }
                  timestamp={interimSegment.timestamp}
                  length={interimSegment.length}
                  audioFilePath={`${audioFolder}${startTimestamp}/dummy}`} // dummy
                  offsetSeconds={0} // dummy
                />
              </div>
            </div>
          )}
          <div ref={endOfMinutesRef} />
        </div>
      </div>
    </div>,
    scrollToBadge,
  ];
};

const TopicBadge = (props: { index: number; segment: DiscussionSegment }) => {
  const { index, segment } = props;

  const avatar = (
    <Avatar
      className={`h-8 w-8 ${segment.topicStartedPoint ? "bg-emerald-400" : ""}`}
    >
      <span className="text-xs">{segment.speaker ?? `${index}`}</span>
    </Avatar>
  );

  const handleClick = (e: any) => {
    switch (e.detail) {
      case 2:
        processDiscussionAction({
          type: "changeTopicStartedPoint",
          payload: { segmentIndex: index },
        });
        break;
    }
  };
  const badgeClassName = `p-1 hover:cursor-pointer hover:rounded-full hover:bg-emerald-400/30`;

  return segment.topicStartedPoint ? (
    // useRef で利用するため必ず div で囲む
    <div>
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        badgeContent={<Bookmark className=" text-amber-400" fontSize="small" />}
        onClick={handleClick}
        className={badgeClassName}
      >
        {avatar}
      </Badge>
    </div>
  ) : (
    <div onClick={handleClick} className={badgeClassName}>
      {avatar}
    </div>
  );
};
