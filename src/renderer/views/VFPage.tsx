/*
Copyright 2024 SpiralMind Co., Ltd. & Humanest Ltd. & Spiral Effect

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
import { useIndexedDB } from "react-indexed-db-hook";
import { IPCInvokeKeys, IPCSenderKeys } from "../../common/constants.js";
import { AssistantAIData } from "../../main/agent/agentManagerDefinition.js";
import { HeaderComponent } from "./HeaderComponent.jsx";
import { MainMenuComponent } from "./MainMenuComponent.jsx";
import {
  DB_MINUTES,
  DB_MINUTES_TITLES,
  Minutes,
  MinutesRecord,
  MinutesTitleRecord,
} from "./db/DBConfig.jsx";
import { VANodeStage } from "./flowComponent/VANodeStage.jsx";
import { VFSettings } from "./setting/VFSettings.jsx";
import { useTopicStore } from "./store/useTopicManagerStore.jsx";
import { useVAConfEffect } from "./store/useVAConfStore.jsx";
import { useVFStore } from "./store/useVFStore.jsx";
import { useTopicManager } from "./topic/useTopicManager.jsx";

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
  const minutesTitlesDB = useIndexedDB(DB_MINUTES_TITLES);
  const minutesDB = useIndexedDB(DB_MINUTES);

  // == VF state / dispatch w/ Zustand ==
  const vfState = useVFStore((state) => state);
  const vfDispatch = useVFStore((state) => state.vfDispatch);
  const updateTopicSeeds = useTopicStore((state) => state.updateTopicSeeds);

  // ==  VA Config ==
  useVAConfEffect();

  // == Save to IndexedDB ==
  useEffect(() => {
    let needToUpdateMinutesTitle = false;
    let needToUpdateMinutes = false;

    switch (vfState.needToSaveOnDB) {
      // == minutes ==
      case "updateMinutesTitle":
        needToUpdateMinutesTitle = true;
        break;
      case "createNewMinutes":
        // server
        window.electron.send(
          IPCSenderKeys.CREATE_MINUTES,
          vfState.startTimestamp
        );

        // indexedDB
        needToUpdateMinutesTitle = true;
        needToUpdateMinutes = true;
        break;
      case "setMinutesLines":
        updateTopicSeeds(false);
        needToUpdateMinutes = true;
        break;
      case "updateMinutesText":
      case "removeMinutesText":
      case "splitMinutesText":
      case "mergeUpMinutesText":
      case "changeTopicStartedPoint":
      case "changeTopicAIConfig":
        needToUpdateMinutes = true;
        break;
      case "setTopic":
      case "updateTopic":
      case "removeTopic":
      case "deleteAllTopic":
        needToUpdateMinutes = true;
        break;
      case "addVirtualAssistantConf":
      case "setVirtualAssistantConf":
      case "removeVirtualAssistantConf":
        needToUpdateMinutes = true;
        break;
      case "deleteMinutes":
        if (vfState.startTimestamp) {
          // server
          window.electron.send(
            IPCSenderKeys.DELETE_MINUTES,
            vfState.startTimestamp
          );

          // indexedDB
          minutesTitlesDB
            .deleteRecord(vfState.startTimestamp)
            .then(() => {
              console.log("deleted");
            })
            .catch((error: Error) => {
              console.log(error);
            });
          minutesDB
            .deleteRecord(vfState.startTimestamp)
            .then(() => {
              console.log("deleted");
            })
            .catch((error: Error) => {
              console.log(error);
            })
            .finally(() => {
              vfDispatch({
                type: "savedOnDB",
                payload: {
                  db: DB_MINUTES,
                  key: undefined,
                },
              });
            });
        }
        break;
    }
    // update
    if (needToUpdateMinutesTitle) {
      minutesTitlesDB
        .update({
          id: vfState.startTimestamp,
          json: JSON.stringify({
            title: vfState.minutesTitle,
            startTimestamp: vfState.startTimestamp,
          }),
        })
        .then((id) => {
          //console.log("created", id);
        })
        .catch((error: Error) => {
          console.log(error);
        })
        .finally(() => {
          vfDispatch({
            type: "savedOnDB",
            payload: {
              db: DB_MINUTES_TITLES,
              key: undefined,
            },
          });
        });
    }
    if (needToUpdateMinutes) {
      console.log("update minutes: assistants", vfState.assistants);
      minutesDB
        .update({
          id: vfState.startTimestamp,
          json: JSON.stringify({
            title: vfState.minutesTitle,
            startTimestamp: vfState.startTimestamp,
            minutes: vfState.discussion,
            topics: vfState.topics,
            assistants: vfState.assistants,
            topicAIConf: vfState.topicAIConf,
            interimSegment: vfState.interimSegment,
          }),
        })
        .then((id) => {
          //console.log("created", id);
        })
        .catch((error: Error) => {
          console.log(error);
        })
        .finally(() => {
          vfDispatch({
            type: "savedOnDB",
            payload: {
              db: DB_MINUTES,
              key: undefined,
            },
          });
        });
    }
  }, [vfState.needToSaveOnDB]);

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

  // Topic Manager
  useTopicManager();

  return (
    <div className="flex bg-indigo-950  text-zinc-600">
      <MainMenuComponent vfState={vfState} vfDispatch={vfDispatch} />
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

export function useDownloadMinutes(): (targetMinutes: number) => void {
  const minutesDB = useIndexedDB(DB_MINUTES);
  const minutesTitleDB = useIndexedDB(DB_MINUTES_TITLES);

  const handleDownload = (targetMinutes: number) => {
    minutesDB.getByID<MinutesRecord>(targetMinutes).then((minutesRecord) => {
      const minutes = JSON.parse(minutesRecord.json) as Minutes;
      const zip = new JSZip();
      const results: JSZip[] = [];

      // minutesTitle
      minutesTitleDB
        .getByID<MinutesTitleRecord>(targetMinutes)
        .then((minutesTitleRecord) => {
          const minutesTitle = JSON.parse(minutesTitleRecord.json);
          results.push(
            zip.file("minutesTitle.json", JSON.stringify(minutesTitle))
          );
          results.push(zip.file("minutesTitle.md", minutesTitle.title));

          // assistants
          window.electron
            .invoke(
              IPCInvokeKeys.LANGCHAIN_GET_ALL_ASSISTANT_DATA,
              targetMinutes,
              minutes.assistants.map((assistant) => {
                return {
                  dataThreadId: assistant.assistantId,
                  assistantName: assistant.assistantName,
                };
              })
            )
            .then((res: AssistantAIData[]) => {
              res.map((assistantData) => {
                results.push(
                  zip.file(
                    `assistant_${assistantData.startTimestamp}.json`,
                    JSON.stringify(assistantData)
                  )
                );
                results.push(
                  zip.file(
                    `assistant_${assistantData.startTimestamp}.md`,
                    assistantData.messages
                      .map((message) => {
                        if ((message as any).type === "ai") {
                          return `#${(message as any).type}\n\n${(message as any).data.content
                            }`;
                        }
                      })
                      .join("\n\n")
                  )
                );
              });

              // topics
              results.push(
                zip.file(
                  "topics.json",
                  JSON.stringify(Array.from(minutes.topics))
                )
              );
              results.push(
                zip.file(
                  "topics.md",
                  Array.from(minutes.topics)
                    .map((item) => {
                      return `# ${item.title}\n\n${item.topic instanceof Array
                        ? item.topic.join("\n")
                        : item.topic
                        }`;
                    })
                    .join("\n\n\n")
                )
              );

              // discussion
              results.push(
                zip.file("discussion.json", JSON.stringify(minutes.minutes))
              );
              results.push(
                zip.file(
                  "discussion.md",
                  Array.from(minutes.minutes)
                    .map((discussionSegment) => {
                      return `${discussionSegment.texts
                        .map((text) => text.text)
                        .join("\n")}`;
                    })
                    .join("\n\n")
                )
              );

              console.log("DL: minutes", minutes);

              // construct contents
              Promise.all(results).then(() => {
                zip.generateAsync({ type: "blob" }).then((content) => {
                  saveAs(content, `va_${targetMinutes}.zip`);
                });
              });
            });
        });
    });
  };
  return handleDownload;
}

export const DownloadAllIDB = () => {
  const minutesTitlesDB = useIndexedDB(DB_MINUTES_TITLES);
  const minutesDB = useIndexedDB(DB_MINUTES);
  return (
    <div>
      <div
        onClick={() => {
          minutesTitlesDB.getAll<MinutesTitleRecord>().then((records) => {
            if (records) {
              const blob = new Blob([JSON.stringify(records)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "minutesTitlesDB.json";
              a.click();
            }
          });
        }}
      >
        MinutesTitleRecord DL
      </div>
      <div
        onClick={() => {
          minutesDB.getAll<MinutesRecord>().then((records) => {
            if (records) {
              const blob = new Blob([JSON.stringify(records)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "minutesDB.json";
              a.click();
            }
          });
        }}
      >
        MinutesRecord DL
      </div>
    </div>
  );
};
