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
import {
  createHashRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import { MainPage } from "./views/MainPage.jsx";

export const App = () => {
  // router
  const router = createHashRouter(
    createRoutesFromElements(
      <Route errorElement={<div>Error</div>}>
        <Route path="/" element={<MainPage />}></Route>
      </Route>
    )
  );
  return <RouterProvider router={router} />;
};
