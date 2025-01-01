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
import { ChangeEvent, FocusEvent, useState } from "react";
import { useVBSettingsStore } from "../../store/useVBSettingStore.jsx";
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  Button,
} from "@mui/material";
import CropperOrigin, { Area } from "react-easy-crop";
import { AttachFile, DeleteOutline } from "@mui/icons-material";
import { UserAvatar } from "../common/UserAvatar.jsx";
const Cropper = CropperOrigin as unknown as typeof CropperOrigin.default;

export const UserSettings = () => {
  const dispatch = useVBSettingsStore((state) => state.settingDispatch);
  const nameFromStore = useVBSettingsStore((state) => state.name);
  const emailFromStore = useVBSettingsStore((state) => state.email);

  // ローカル状態
  const [name, setName] = useState(nameFromStore);
  const [email, setEmail] = useState(emailFromStore);

  const handleBlur =
    (field: "name" | "email") =>
    (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      dispatch({
        type: "setUserSettings",
        payload: { [field]: event.target.value },
      });
    };

  return (
    <div className="w-full flex flex-col space-y-6">
      <UserAvatarEditor />
      <TextField
        value={name}
        label={"Name"}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur("name")}
      />
      <TextField
        value={email}
        label={"Email"}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={handleBlur("email")}
      />
    </div>
  );
};

const UserAvatarEditor = () => {
  const dispatch = useVBSettingsStore((state) => state.settingDispatch);
  const avatarImage = useVBSettingsStore((state) => state.avatarImage);
  const name = useVBSettingsStore((state) => state.name);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(avatarImage ?? null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const base64 = await toBase64(file);
        setImageSrc(base64 as string);
        setIsCropperOpen(true);
      } catch (error) {
        console.error("Error converting file to base64:", error);
      }
    }
  };

  const toBase64 = (file: File): Promise<string | ArrayBuffer | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCroppedImage = async () => {
    if (imageSrc && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      dispatch({
        type: "setUserSettings",
        payload: { avatarImage: croppedImage },
      });
      setIsCropperOpen(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="flex flex-col items-center">
        <UserAvatar
          name={name}
          avatarImage={avatarImage}
          className={`w-20 h-20 ${avatarImage ? "cursor-pointer" : ""}`}
          onClick={() => avatarImage && setIsCropperOpen(true)}
        />

        <div className="mt-2">
          <Button
            variant="text"
            className="text-zinc-600"
            onClick={() =>
              dispatch({
                type: "setUserSettings",
                payload: { avatarImage: undefined },
              })
            }
          >
            <DeleteOutline fontSize="small" />
          </Button>
          <label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <Button variant="outlined" component="span">
              <span className="flex items-center">
                <AttachFile fontSize="small" />
              </span>
            </Button>
          </label>
        </div>
      </div>

      <Dialog
        open={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent style={{ position: "relative", height: "400px" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            className="text-zinc-600"
            onClick={() => setIsCropperOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="outlined"
            onClick={handleSaveCroppedImage}
            color="primary"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// ユーティリティ関数
const getCroppedImg = async (imageSrc: string, crop: Area): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;

  return new Promise<string>((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject("Failed to get canvas context");
        return;
      }

      ctx.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );

      resolve(canvas.toDataURL("image/jpeg"));
    };
    image.onerror = (error) => reject(error);
  });
};
