import { useState } from "react";
import Markdown from "react-markdown";
import { TextField } from "@mui/material";
import remarkGfm from "remark-gfm";
import {
  Content,
  getBaseContent,
} from "../../../../../common/content/content.js";
import { useMinutesContentStore } from "../../../store/useContentStore.jsx";

export const createTextContent = (props?: Partial<Content>): Content => {
  const content = getBaseContent();
  content.type = "text";
  if (props) {
    if (props.content) {
      content.content = props.content;
    }
    if (props.position) {
      content.position = props.position;
    }
    if (props.width) {
      content.width = props.width;
    }
  }
  return content;
};

export const TextContentView = (props: { content: Content }) => {
  const { content } = props;
  return (
    <div className="p-4">
      <Markdown remarkPlugins={[remarkGfm]} className={"markdown"}>
        {content.content}
      </Markdown>
    </div>
  );
};

export const TextContentEditView = (props: {
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
