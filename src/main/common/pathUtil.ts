import { app } from "electron";
import path from "node:path";

export const getTeamFolderPath = (): string => {
  return path.join(app.getPath("userData"), "teams", "/");
};

export const getMinutesFolderPath = (teamId: string): string => {
  return path.join(getTeamFolderPath(), teamId, "minutes", "/");
};

export const getPluginFolderPath = (teamId: string): string => {
  return path.join(getTeamFolderPath(), teamId, "plugin", "/");
};
