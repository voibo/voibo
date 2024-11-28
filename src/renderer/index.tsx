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
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./index.css";
import "./markdown.css";

(async () => {
  let newNonce;
  await window.electron.invoke("getNonce").then((nonce) => (newNonce = nonce));
  const cache = createCache({
    key: "my-prefix-key",
    prepend: true,
    nonce: newNonce,
  });

  createRoot(document.getElementById("root")!).render(
    <CacheProvider value={cache}>
      <StrictMode>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <App />
        </LocalizationProvider>
      </StrictMode>
    </CacheProvider>
  );
})();
