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
import { Close, Replay } from "@mui/icons-material";
import { Button, ToggleButton } from "@mui/material";
import { Fragment, HTMLAttributes, useEffect, useState } from "react";
import { GENERAL_ASSISTANT_NAME } from "../../../../common/agentManagerDefinition.js";
import { useDetailViewDialog } from "../../common/useDetailViewDialog.jsx";
import {
  AssistantState,
  useMinutesAssistantStore,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { useVFStore } from "../../store/useVFStore.jsx";
import { ManualModeInputComponent } from "../input/ManualModeInputComponent.jsx";
import { AIAssistantAvatar } from "./AIAssistantAvatar.jsx";
import { VAMessage } from "./VAMessage.jsx";

const GeneralAssistantMessagesCore = (
  props: {
    assistantConfig: VirtualAssistantConf;
    dispatchClose: (value: boolean) => void;
  } & HTMLAttributes<HTMLDivElement>
) => {
  const { assistantConfig, dispatchClose, ...rest } = props;
  const { icon, label, assistantName } = assistantConfig;
  const vfState = useVFStore((state) => state);
  const vfDispatch = useVFStore((state) => state.vfDispatch);

  if (!vfState.startTimestamp) {
    return <></>;
  }

  console.log("GeneralAssistantMessagesCore", assistantConfig);
  const [state, setState] = useState<AssistantState | null>(null);
  const dispatch = useMinutesAssistantStore(vfState.startTimestamp)
    .getState()
    .assistantDispatch(assistantConfig);

  const assistantLoad = async () => {
    setState(
      await useMinutesAssistantStore(vfState.startTimestamp!)
        .getState()
        .getOrInitAssistant(assistantConfig)
    );
  };

  useEffect(() => {
    assistantLoad();
  }, [vfState.startTimestamp]);

  // detail view dialog
  const { detailViewDialog, renderDetailViewDialog } = useDetailViewDialog();

  // clear by parent
  useEffect(() => {
    if (vfState.mode === "home") {
      dispatch({
        type: "clearAll",
      });
    }
  }, [vfState.mode]);

  return (
    state && (
      <>
        <div className="overflow-hidden w-96">
          <div className="rounded p-2 bg-blue-800">
            <div className="relative flex flex-row items-start h-full">
              <div className="mt-0 flex flex-row items-center w-full">
                <div className="flex flex-grow text-white">
                  <div className="flex items-center">
                    <AIAssistantAvatar
                      label={label}
                      icon={icon}
                      sx={{ width: "2.5rem", height: "2.5rem" }}
                    />
                    <span className="ml-2">{label}</span>
                  </div>
                </div>
                <div className="flex-0 flex flex-row items-center">
                  <Button
                    className="min-w-0 min-h-0 text-white"
                    onClick={() => {
                      if (vfState.startTimestamp) {
                        dispatch({
                          type: "initialize",
                          payload: {
                            startTimestamp: vfState.startTimestamp,
                            assistantName: assistantName,
                          },
                        });
                      }
                    }}
                  >
                    <Replay sx={{ fontSize: "1rem" }} />
                  </Button>
                  <Button
                    className="min-w-0 min-h-0 text-white"
                    onClick={() => {
                      dispatchClose(false);
                    }}
                  >
                    <Close sx={{ fontSize: "1rem" }} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-[calc(100vh-38.5rem)] overflow-y-scroll bg-white border border-t-0  border-blue-400">
            <div className="flex flex-col ">
              <div>
                {(state.messagesWithInvoked ?? []).map((message, index) =>
                  vfState.startTimestamp != undefined ? (
                    <Fragment key={index}>
                      <VAMessage
                        assistantConfig={assistantConfig}
                        message={message}
                        startTimestamp={vfState.startTimestamp}
                        detailViewDialog={detailViewDialog}
                      />
                    </Fragment>
                  ) : (
                    <></>
                  )
                )}
              </div>
            </div>
          </div>
          <ManualModeInputComponent
            state={state}
            dispatch={dispatch}
            vfState={vfState}
            vfDispatch={vfDispatch}
            vaConfig={assistantConfig}
          />
        </div>
        {renderDetailViewDialog()}
      </>
    )
  );
};

const GeneralAssistant = (props: { gaConf: VirtualAssistantConf }) => {
  const { gaConf } = props;
  const [selected, setSelected] = useState(false);
  return (
    <>
      {selected ? (
        <GeneralAssistantMessagesCore
          assistantConfig={gaConf}
          dispatchClose={setSelected}
        />
      ) : (
        <ToggleButton
          value="check"
          selected={selected}
          onChange={() => {
            setSelected(!selected);
          }}
          className="rounded-full bg-blue-400 w-20 h-20"
        >
          <AIAssistantAvatar
            label={gaConf.label}
            icon={gaConf.icon}
            sx={{ width: "3.5rem", height: "3.5rem" }}
          />
        </ToggleButton>
      )}
    </>
  );
};

export const GeneralAssistantPart = (props: {}) => {
  const vfState = useVFStore((state) => state);
  const gaConf = vfState.assistants.find(
    (assistant) => assistant.assistantId === GENERAL_ASSISTANT_NAME
  );
  return gaConf && <GeneralAssistant gaConf={gaConf} />;
};
