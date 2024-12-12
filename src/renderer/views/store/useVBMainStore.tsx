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
import { useEffect } from "react";
import { create } from "zustand";
import { IPCInvokeKeys } from "../../../common/constants.js";

/***
 * Manage the configuration file stored in the electron main process
 */
export type VBMainStore = {
  conf?: VBMainConf;
  needToSave: boolean;
  load: (conf: VBMainConf) => void;
  update: (conf: VBMainConf) => void;
};

export const useVBMainStore = create<VBMainStore>((set) => ({
  conf: undefined,
  needToSave: false,
  load: (conf: VBMainConf) => set({ conf, needToSave: false }),
  update: (conf: VBMainConf) => set({ conf, needToSave: true }),
}));

export const useVBMainStoreEffect = () => {
  const vbMainStore = useVBMainStore();

  useEffect(() => {
    window.electron.invoke(IPCInvokeKeys.GET_VB_MAIN_STORE).then((res) => {
      vbMainStore.load(res);
    });
  }, []);

  useEffect(() => {
    if (vbMainStore.conf && vbMainStore.needToSave) {
      window.electron.invoke(IPCInvokeKeys.UPDATE_VA_CONFIG, vbMainStore.conf);
      vbMainStore.load(vbMainStore.conf);
    }
  }, [vbMainStore.conf]);
};
