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
import { Avatar, Badge, Tooltip } from "@mui/material";
import mermaid from "mermaid";
import {
  ComponentType,
  HTMLAttributes,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import JsxParser_ from "react-jsx-parser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../../../../common/agentManagerDefinition.js";
import { DetailViewDialogState } from "../../common/useDetailViewDialog.jsx";
import { VirtualAssistantConf } from "../../../store/useAssistantsStore.jsx";
import { AttachedPromptParts } from "../input/AttachedPromptParts.jsx";
import { AIAssistantAvatar } from "./AIAssistantAvatar.jsx";
import { detectVAMessageType } from "./detectVAMessageType.jsx";

const JsxParser = JsxParser_ as unknown as typeof JsxParser_.default;

export const VAMessage = (
  props: {
    assistantConfig: VirtualAssistantConf;
    message: Message;
    startTimestamp: number;
    detailViewDialog: (props: Omit<DetailViewDialogState, "onClose">) => void;
    avatarLocation?: "H" | "V"; // default "H" : Horizontal
  } & HTMLAttributes<HTMLDivElement>
) => {
  const {
    message,
    startTimestamp,
    detailViewDialog,
    assistantConfig,
    avatarLocation,
    ...rest
  } = props;
  let html = <></>;

  const detectedMessage = detectVAMessageType(message);
  //console.log("VAMessage", detectedMessage);
  let mindMap: string;
  const messageIDs = message.connectedMessageIds;
  switch (detectedMessage.type) {
    case "InvokedMessageWithAttachment":
      const customField: Record<string, string> | undefined =
        detectedMessage.value.customField;
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={<UserAvatar />}
          message={
            <AttachedPromptParts
              title={
                customField && customField[`label`]
                  ? customField && customField[`label`]
                  : " "
              }
              content={detectedMessage.value.content}
            />
          }
          iconLocation="R"
          avatarLocation={avatarLocation}
        />
      );
      break;
    case "InvokedMessage":
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={<UserAvatar />}
          message={
            <ReactMarkdown remarkPlugins={[remarkGfm]} className={"markdown"}>
              {detectedMessage.value.content}
            </ReactMarkdown>
          }
          iconLocation="R"
          avatarLocation={avatarLocation}
        />
      );
      break;
    case "LangChainAIMessage":
      const isJson = detectedMessage.value.isJSON;
      const outputComp = detectedMessage.value.reactComponent;
      //console.log("LangChainAIMessage", isJson, outputComp, detectedMessage);
      if (isJson && outputComp) {
        // JSON data の場合には 専用表示componentも必要
        const output = JSON.parse(detectedMessage.value.content.toString());
        html = (
          <JsxParser
            bindings={{
              output: output,
              topicIDs: messageIDs,
              assistantConfig: assistantConfig,
            }}
            components={{
              VAMessageLayout: VAMessageLayout as ComponentType,
              AIAssistantAvatar,
            }}
            jsx={outputComp as string}
          />
        );
      } else {
        html = (
          <VAMessageLayout
            messageIds={messageIDs}
            icon={
              <AIAssistantAvatar
                label={assistantConfig.label}
                icon={assistantConfig.icon}
                withLabel={avatarLocation === "V"}
              />
            }
            message={
              <ReactMarkdown remarkPlugins={[remarkGfm]} className={"markdown"}>
                {detectedMessage.value.content.toString()}
              </ReactMarkdown>
            }
            iconLocation="L"
            avatarLocation={avatarLocation}
          />
        );
      }

      break;
    case "LangChainHumanMessage":
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={<UserAvatar />}
          message={
            <ReactMarkdown remarkPlugins={[remarkGfm]} className={"markdown"}>
              {detectedMessage.value.content.toString()}
            </ReactMarkdown>
          }
          iconLocation="R"
          avatarLocation={avatarLocation}
        />
      );
      break;
    case "LangChainAIMessageWithAttachment":
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={
            <AIAssistantAvatar
              label={assistantConfig.label}
              icon={assistantConfig.icon}
              withLabel={avatarLocation === "V"}
            />
          }
          message={
            <AttachedPromptParts
              title={
                /*
                (
                  detectedMessage.value.additional_kwargs[
                    `customField`
                  ] as Record<string, string>
                )[`label`]
                */
                ""
              }
              content={detectedMessage.value.content.toString()}
            />
          }
          iconLocation="L"
          avatarLocation={avatarLocation}
        />
      );
      break;
    case "LangChainHumanMessageWithAttachment":
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={<UserAvatar />}
          message={
            <AttachedPromptParts
              title={
                /*
                (
                  detectedMessage.value.additional_kwargs[
                    `customField`
                  ] as Record<string, string>
                )[`label`]
                */
                ""
              }
              content={detectedMessage.value.content.toString()}
            />
          }
          iconLocation="R"
          avatarLocation={avatarLocation}
        />
      );
      break;
    case "LangChainAIMessageMindMap":
      try {
        mindMap = JSON.parse(detectedMessage.value.content.toString()).code;
      } catch (e) {
        mindMap = "";
      }
      console.log(
        "LangChainAIMessageMindMap: MermaidMindMap"
        //mindMap,
      );
      html = (
        <VAMessageLayout
          messageIds={messageIDs}
          icon={
            <AIAssistantAvatar
              label={assistantConfig.label}
              icon={assistantConfig.icon}
              withLabel={avatarLocation === "V"}
            />
          }
          message={
            <div
              className="w-full"
              onClick={() => {
                detailViewDialog({
                  content: <MermaidMindMap src={mindMap} />,
                  dialogConf: {
                    fullWidth: true,
                    maxWidth: false,
                  },
                });
              }}
            >
              <MermaidMindMap src={mindMap} />
            </div>
          }
          iconLocation="L"
          avatarLocation={avatarLocation}
        />
      );
      break;
  }

  return <div {...rest}>{html}</div>;
};

export type VAMessageLayoutProps = {
  icon: ReactNode;
  message: ReactNode;
  iconLocation: "L" | "R" | "T";
  messageIds: string[];
  avatarLocation?: "H" | "V"; // default "H" : Horizontal
};
export const VAMessageLayout: React.FC<VAMessageLayoutProps> = (
  props: VAMessageLayoutProps
) => {
  const {
    icon,
    message,
    iconLocation: iconLocation,
    messageIds: messageIds,
    avatarLocation,
  } = props;

  const spacer = (
    <Tooltip title={messageIds?.join(",") ?? "No topic"}>
      <span className="mr-10">　</span>
    </Tooltip>
  ); // w-10 なので mr-10 として合わせる

  return avatarLocation && avatarLocation === "V" ? (
    // Vertical
    <div className="flex flex-col w-full">
      <div className="w-full mb-2">{icon}</div>
      <div className="p-6 bg-blue-100 rounded">{message}</div>
    </div>
  ) : (
    // avatarLocation === "H" || undefined
    <div className="flex w-full py-2 px-4">
      <div className="w-10">{iconLocation === "L" ? icon : spacer}</div>
      <div
        className={
          iconLocation === "L"
            ? "mx-2 p-6 bg-blue-100 rounded rounded-tl-none flex-auto"
            : "mx-2 p-6 bg-zinc-100 rounded rounded-tr-none flex-auto"
        }
      >
        {message}
      </div>
      <div className="w-10">{iconLocation === "R" ? icon : spacer}</div>
    </div>
  );
};

const UserAvatar = (props: { badge?: ReactNode }) => {
  const { badge } = props;
  const baseAvatar = (
    <Avatar variant="rounded" className="mr-2">
      <img src="./asset/human.svg" width={28} />
    </Avatar>
  );
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={badge}
    >
      {baseAvatar}
    </Badge>
  );
};

const MermaidMindMap = ({
  src,
  className,
}: {
  src: string;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (src && ref.current) {
      mermaid.init({}, ref.current);
    }
  }, [ref.current, src]);

  return src ? (
    <div ref={ref} key={src} className={className}>
      {src}
    </div>
  ) : (
    <div key={src} />
  );
};
