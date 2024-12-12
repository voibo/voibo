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
import { Backdrop } from "@mui/material";
import { styled } from "@mui/material/styles";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useEffect } from "react";
import { IPCInvokeKeys } from "../../common/constants.js";
import { HeaderComponent } from "./HeaderComponent.jsx";
import { MainMenuComponent } from "./MainMenuComponent.jsx";
import { VANodeStage } from "./flowComponent/VANodeStage.jsx";
import { VFSettings } from "./setting/VFSettings.jsx";
import { useTopicStore } from "./store/useTopicManagerStore.jsx";
import { useVAConfEffect } from "./store/useVAConfStore.jsx";
import { useVBStore } from "./store/useVBStore.jsx";
import { useTopicManager } from "./topic/useTopicManager.jsx";
import { MinutesTitleStore } from "./store/useMinutesTitle.jsx";
import { useMinutesStore } from "./store/useMinutesStore.jsx";
import { useMinutesAssistantStore } from "./store/useAssistantsStore.jsx";

export const drawerWidth = 240;

const MainComponent = styled("div", {
  shouldForwardProp: (prop) => prop !== "open",
})<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.easeOut,
    duration: theme.transitions.duration.enteringScreen,
  }),
  marginLeft: `${open ? 0 : -drawerWidth}px`,
}));

/**
 * 議事録データを元にした分析結果を表示する
 *
 * １　議事録ファイルを指定
 * ２　指定したファイルを一度に行単位で読み込み　⇒　経過時間指定で取り出せるように。
 * ３　指定したデータを「議事録」に表示。このときに時系列に並べる。
 * 4　表示された議事録をOpenAIで分析
 * ５　分析結果を「分析結果」に表示。このときに時系列にそろえて、いつ出したかも表示。
 *
 * @param props
 * @returns
 */
export const VFPage = () => {
  //const minutesDB = useIndexedDB(DB_MINUTES);

  // == VF state / dispatch w/ Zustand ==
  const vfState = useVBStore((state) => state);
  const vfDispatch = useVBStore((state) => state.vfDispatch);

  // ==  VA Config ==
  useVAConfEffect();

  useEffect(() => {
    // == 初回処理 ==
    // 音声フォルダを取得
    window.electron.invoke(IPCInvokeKeys.GET_AUDIO_FOLDER_PATH).then((res) => {
      vfDispatch({
        type: "setAudioFolder",
        payload: {
          audioFolder: res,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (vfState.lastAction) {
      switch (vfState.lastAction.type) {
        case "setMinutesLines":
          useTopicStore.getState().updateTopicSeeds(false);
          break;
      }
    }
  }, [vfState.lastAction]);

  // Topic Manager
  useTopicManager();

  return (
    <div className="flex bg-indigo-950  text-zinc-600">
      <MainMenuComponent />
      <MainComponent open={vfState.mainMenuOpen}>
        <audio id="globalAudio"></audio>

        <HeaderComponent />
        <div className="flex flex-col">
          <VANodeStage />
        </div>
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer - 1 }}
          open={vfState.mainMenuOpen}
        ></Backdrop>
        {/* Setting */}
        <VFSettings />
      </MainComponent>
    </div>
  );
};

export function useDownloadMinutes(
  useMinutesTitle: MinutesTitleStore
): (targetMinutes: number) => void {
  const handleDownload = (targetMinutes: number) => {
    const zip = new JSZip();
    const results: JSZip[] = [];

    const minutesTitle = useMinutesTitle.getMinutesTitle(targetMinutes);
    const minutesStore = useMinutesStore(targetMinutes).getState();
    const assistantStore = useMinutesAssistantStore(targetMinutes).getState();

    if (minutesTitle && minutesStore && assistantStore) {
      results.push(zip.file("minutesTitle.json", JSON.stringify(minutesTitle)));
      results.push(zip.file("minutesTitle.md", minutesTitle));

      // topics
      results.push(
        zip.file("topics.json", JSON.stringify(Array.from(minutesStore.topics)))
      );
      results.push(
        zip.file(
          "topics.md",
          Array.from(minutesStore.topics)
            .map((item) => {
              return `# ${item.title}\n\n${
                item.topic instanceof Array ? item.topic.join("\n") : item.topic
              }`;
            })
            .join("\n\n\n")
        )
      );

      // discussion
      results.push(
        zip.file("discussion.json", JSON.stringify(minutesStore.discussion))
      );
      results.push(
        zip.file(
          "discussion.md",
          Array.from(minutesStore.discussion)
            .map((discussionSegment) => {
              return `${discussionSegment.texts
                .map((text) => text.text)
                .join("\n")}`;
            })
            .join("\n\n")
        )
      );

      // assistants
      assistantStore.assistantsMap.forEach((assistant) => {
        (assistant.messages ?? []).forEach((message) => {
          results.push(
            zip.file(
              `assistant/${assistant.vaConfig.assistantId}/${message.id}.json`,
              JSON.stringify(message)
            )
          );
          results.push(
            zip.file(
              `assistant/${assistant.vaConfig.assistantId}/${message.id}.md`,
              message.content
            )
          );
        });
      });

      console.log("DL: minutes", minutesStore);
      // construct contents
      Promise.all(results).then(() => {
        zip.generateAsync({ type: "blob" }).then((content) => {
          saveAs(content, `va_${targetMinutes}.zip`);
        });
      });
    }
  };
  return handleDownload;
}
