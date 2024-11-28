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
import { useEffect } from "react";
import { create } from "zustand";
import { IPCInvokeKeys } from "../../../common/constants.js";

/***
 * Virtual Assistant Configuration
 *
 * electronのメインプロセスに保管される設定ファイルを扱う
 */

export type VAConfStore = {
  conf?: VAConf;
  needToSaveOnVAConf: boolean;
  loadedVAConf: (conf: VAConf) => void;
  updateVAConf: (conf: VAConf) => void;
};

export const useVAConfStore = create<VAConfStore>((set) => ({
  conf: undefined,
  needToSaveOnVAConf: false,
  loadedVAConf: (conf: VAConf) => set({ conf, needToSaveOnVAConf: false }),
  updateVAConf: (conf: VAConf) => set({ conf, needToSaveOnVAConf: true }),
}));

/**
 * VAConfStore と electron の設定ファイルを連携する。
 *  LLMのKeyなど
 * メインとなるVFPage でのみ使用することを想定している。
 */
export const useVAConfEffect = () => {
  const vaConfStore = useVAConfStore();

  useEffect(() => {
    window.electron.invoke(IPCInvokeKeys.GET_VA_CONFIG).then((res) => {
      vaConfStore.loadedVAConf(res);
    });
  }, []);

  useEffect(() => {
    if (vaConfStore.conf && vaConfStore.needToSaveOnVAConf) {
      window.electron.invoke(IPCInvokeKeys.UPDATE_VA_CONFIG, vaConfStore.conf);
      vaConfStore.loadedVAConf(vaConfStore.conf);
    }
  }, [vaConfStore.conf]);
};
