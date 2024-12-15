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

import { useState } from "react";
import { Dialog, Tab } from "@mui/material";
import { Settings } from "@mui/icons-material";
import TabContext_ from "@mui/lab/TabContext";
import TabList_ from "@mui/lab/TabList";
import TabPanel_ from "@mui/lab/TabPanel";
import { MicSettings } from "./AudioDeviceSettings.jsx";
import { LLMSetting } from "./LLMSetting.jsx";
import { TranscriberSetting } from "./TranscriberSetting.jsx";
import { useVBStore } from "../../store/useVBStore.jsx";
import { processVBAction } from "../../action/VBAction.js";

const TabContext = TabContext_ as unknown as typeof TabContext_.default;
const TabList = TabList_ as unknown as typeof TabList_.default;
const TabPanel = TabPanel_ as unknown as typeof TabPanel_.default;

export const VBSettings = () => {
  const vbState = useVBStore((state) => state);

  const handleClose = () => {
    processVBAction({ type: "changeVBSettingsDialogOpen" });
  };

  const [selectedTab, selectTab] = useState("1");
  const handleTabChange = (event: any, value: string) => {
    selectTab(value);
  };

  return (
    <Dialog open={vbState.vbSettingsDialogOpen} onClose={handleClose}>
      <div className="p-4 text-zinc-600">
        <div className="flex items-center justify-start text-lg">
          <Settings className="mr-2" />
          Settings
        </div>

        <TabContext value={selectedTab}>
          <div className="w-full border-b-2">
            <TabList
              onChange={handleTabChange}
              aria-label="lab API tabs example"
            >
              <Tab label="Audio Devices" value="1" className="normal-case" />
              <Tab label="Transcriber" value="2" className="normal-case" />
              <Tab label="Keys" value="3" className="normal-case" />
            </TabList>
          </div>

          <TabPanel value="1">
            <MicSettings />
          </TabPanel>
          <TabPanel value="2">
            <TranscriberSetting />
          </TabPanel>
          <TabPanel value="3">
            <LLMSetting />
          </TabPanel>
        </TabContext>
      </div>
    </Dialog>
  );
};
