import { useState, useCallback, useEffect } from "react";
import { NodeResizer } from "@xyflow/react";
import {
  Content,
  getBaseContent,
} from "../../../../../common/content/content.js";
import { ScreenCapture } from "../../../../../common/content/screencapture.js";
import { ScreenCaptureThumbnail } from "../../../component/screencapture/ScreenCaptureThumbnail.jsx";
import { useVBStore } from "../../../store/useVBStore.jsx";
import { useMinutesContentStore } from "../../../store/useContentStore.jsx";

export type CapturedImageContentParam = Partial<Content> & {
  frame: ScreenCapture;
};
export const createCapturedImageContent = (
  props?: CapturedImageContentParam
): Content => {
  const content = getBaseContent();
  content.type = "capturedImage";
  if (props) {
    if (props.position) {
      content.position = props.position;
    }
    if (props.width) {
      content.width = props.width;
    }
    if (props.connectedMessageIds) {
      content.connectedMessageIds = props.connectedMessageIds;
    }
    if (props.agendaIds) {
      content.agendaIds = props.agendaIds;
    }
    if (props.groupIds) {
      content.groupIds = props.groupIds;
    }
    //  construct content  JSON of ScreenCapture
    if (props.frame) {
      content.content = JSON.stringify(props.frame);
    } else if (props.content) {
      content.content = props.content;
    }
  }
  return content;
};

export const CapturedImageContentView = (props: {
  content: Content;
  minutesStartTimestamp: number;
  openDialog: boolean;
}) => {
  const { content, minutesStartTimestamp, openDialog } = props;
  // restore content from JSON of ScreenCapture
  try {
    let screenCapture: ScreenCapture = JSON.parse(content.content);
    return (
      <div
        style={{
          width: content.width ? `${content.width}px` : "300px",
        }}
      >
        <ScreenCaptureThumbnail
          capturedScreen={screenCapture}
          startTimestamp={minutesStartTimestamp}
          className="w-full h-auto p-0"
          openDialog={openDialog}
        />
      </div>
    );
  } catch (e) {
    console.error("CapturedImageContentView: invalid content", content);
    return <></>;
  }
};

export const CapturedImageContentEditView = (props: {
  content: Content;
  minutesStartTimestamp: number;
}) => {
  const { content, minutesStartTimestamp } = props;

  // ScreenCaptureオブジェクトの復元
  try {
    let screenCapture: ScreenCapture = JSON.parse(content.content);
    return (
      <ScreenCaptureThumbnail
        capturedScreen={screenCapture}
        startTimestamp={minutesStartTimestamp}
        className="w-full h-auto p-0"
        openDialog={false}
      />
    );
  } catch (e) {
    console.error("CapturedImageContentEditView: invalid content", content);
    return <></>;
  }
};
