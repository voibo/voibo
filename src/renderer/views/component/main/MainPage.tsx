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
import { useEffect } from "react";
import { IPCInvokeKeys } from "../../../../common/constants.js";
import { HeaderComponent } from "./HeaderComponent.jsx";
import { MainMenuComponent } from "./MainMenuComponent.jsx";
import { VBNodeStage } from "../../flowComponent/VBNodeStage.jsx";
import { VBSettings } from "../setting/VBSettings.jsx";
import { useVBMainStoreEffect } from "../../store/useVBMainStore.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { useTopicManager } from "../topic/useTopicManager.jsx";
import { processVBAction } from "../../action/VBAction.js";

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

export const MainPage = () => {
  const mainMenuOpen = useVBStore((state) => state.mainMenuOpen);

  // ==  VA Config ==
  useVBMainStoreEffect();

  useEffect(() => {
    // == 初回処理 ==
    // 音声フォルダを取得
    window.electron.invoke(IPCInvokeKeys.GET_AUDIO_FOLDER_PATH).then((res) => {
      processVBAction({
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
      <MainMenuComponent />
      <MainComponent open={mainMenuOpen}>
        <audio id="globalAudio"></audio>

        <HeaderComponent />
        <div className="flex flex-col">
          <VBNodeStage />
        </div>
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer - 1 }}
          open={mainMenuOpen}
        ></Backdrop>
        {/* Setting */}
        <VBSettings />
      </MainComponent>
    </div>
  );
};
