import { useState } from "react";
import { TextField } from "@mui/material";
import {
  Content,
  getBaseContent,
} from "../../../../../common/content/content.js";
import { useMinutesContentStore } from "../../../store/useContentStore.jsx";
import { ScreenCaptureThumbnail } from "../../../component/discussion/ScreenCaptureThumbnail.jsx";
import { ScreenCapture } from "../../../../../common/content/screencapture.js";

export const createCapturedImageContent = (
  props?: Partial<Content> & { frame: ScreenCapture }
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
}) => {
  const { content, minutesStartTimestamp } = props;
  // restore content from JSON of ScreenCapture
  try {
    let screenCapture: ScreenCapture = JSON.parse(content.content);
    return (
      <ScreenCaptureThumbnail
        capturedScreen={screenCapture}
        startTimestamp={minutesStartTimestamp}
        className="w-{200} h-auto p-0"
      />
    );
  } catch (e) {
    console.error("CapturedImageContentView: invalid content", content);
    return <></>;
  }
};

export const CapturedImageContentEditView = (props: {
  minutesStartTimestamp: number;
  content: Content;
}) => {
  const { minutesStartTimestamp, content } = props;
  // Content の編集
  const [stateTempContent, setTempContent] = useState(content.content);

  const handleContentChange = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element>
  ) => {
    useMinutesContentStore(minutesStartTimestamp)
      .getState()
      .setContent({
        ...content,
        content: stateTempContent,
      });
  };

  return (
    <div className="p-0 grid grid-cols-1 space-y-4">
      <TextField
        fullWidth
        variant="outlined"
        multiline
        minRows={3}
        size="small"
        value={stateTempContent}
        onChange={(event) => setTempContent(event.target.value)}
        onBlur={handleContentChange}
      ></TextField>
    </div>
  );
};
