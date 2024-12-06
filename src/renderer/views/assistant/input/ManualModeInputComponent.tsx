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
import { Dispatch } from "react";
import {
  AssistantAction,
  AssistantState,
  VirtualAssistantConf,
} from "../../store/useAssistantsStore.jsx";
import { VFAction, VFState } from "../../store/useVFStore.jsx";
import { AIAssistantManualInput } from "./AIAssistantManualInput.jsx";
import { AIAssistantModeSelector } from "./AIAssistantModeSelector.jsx";
import { AIModelSelector } from "./AIModelSelector.jsx";
import { VirtualAssistantRequester } from "./VirtualAssistantRequester.jsx";

export const ManualModeInputComponent = (props: {
  state: AssistantState;
  dispatch: Dispatch<AssistantAction>;
  vfState: VFState;
  vfDispatch: Dispatch<VFAction>;
  vaConfig: VirtualAssistantConf;
}) => {
  const { state, dispatch, vfState, vfDispatch, vaConfig } = props;
  return (
    <div className="bg-blue-300 rounded-t-none rounded flex flex-col">
      <VirtualAssistantRequester
        state={state}
        dispatch={dispatch}
        vfState={vfState}
        vfDispatch={vfDispatch}
      />
      <AIAssistantManualInput
        state={state}
        dispatch={dispatch}
        vfState={vfState}
        vfDispatch={vfDispatch}
      />
      <div className="flex flew-row items-center">
        <div className="flex-1">
          <AIAssistantModeSelector
            stateAI={state}
            dispatchAI={dispatch}
            vfState={vfState}
            vfDispatch={vfDispatch}
          />
        </div>
        <div className="flex-0">
          <AIModelSelector
            vaConfig={vaConfig}
            stateAI={state}
            dispatchAI={dispatch}
            vfState={vfState}
            vfDispatch={vfDispatch}
          />
        </div>
      </div>
    </div>
  );
};
