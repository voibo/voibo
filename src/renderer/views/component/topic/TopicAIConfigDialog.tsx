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
import { Button, Dialog, FormControl, TextField, Tooltip } from "@mui/material";
import { Dispatch, useEffect, useState } from "react";
import { EnglishTopicPrompt } from "../../../../common/content/assisatant.js";
import { AIConfig, AIConfigurator } from "../common/aiConfig.jsx";

import { useVBStore } from "../../store/useVBStore.jsx";
import { useMinutesStore } from "../../store/useMinutesStore.jsx";
import { processTopicAIConfAction } from "../../action/TopicAIConfAction.js";

export const TopicAIConfigDialog = (props: {
  dialogState: boolean;
  dialogDispatch: Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { dialogState, dialogDispatch } = props;
  const startTimestamp = useVBStore((state) => state.startTimestamp);
  const minutesStore = useMinutesStore(startTimestamp);
  const topicAIConf = minutesStore((state) => state.topicAIConf);
  const [stateAIConfig, setAIConfig] = useState<AIConfig>(topicAIConf);

  const handleClose = () => {
    dialogDispatch(false);
  };

  const handleUpdate = () => {
    console.log("Update AI Config", stateAIConfig);
    processTopicAIConfAction({
      type: "changeTopicAIConfig",
      payload: {
        aiConfig: {
          ...stateAIConfig,
          systemPrompt: stateAIConfig.systemPrompt ?? EnglishTopicPrompt,
        },
      },
    });
    handleClose();
  };

  useEffect(() => {
    setAIConfig(topicAIConf);
  }, [topicAIConf]);

  return (
    <Dialog open={dialogState} onClose={handleClose}>
      <div className="m-4 flex text-xl">Topic LLM Settings</div>
      <div className="m-4 grid grid-cols-4 gap-3">
        {stateAIConfig.modelType !== "langGraph" && (
          <>
            <div className="col-span-1">
              <Tooltip title="Prompts to determine assistant role">
                <div>System Prompt</div>
              </Tooltip>
            </div>
            <div className="col-span-3">
              <TextField
                label="Initial Prompt"
                value={topicAIConf.systemPrompt}
                variant="outlined"
                multiline
                minRows={4}
                fullWidth
                onChange={handleUpdate}
              />
            </div>
          </>
        )}

        <AIConfigurator
          initConf={stateAIConfig}
          handler={(newConfig) => {
            console.log("New Config", newConfig);
            setAIConfig({
              ...newConfig,
            });
          }}
        />

        <div className="col-span-4">
          <FormControl fullWidth>
            <Button variant="outlined" onClick={handleUpdate}>
              Update
            </Button>
          </FormControl>
        </div>
      </div>
    </Dialog>
  );
};
