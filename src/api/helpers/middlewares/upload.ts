import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_photos",
    allowed_formats: ["jpg", "png", "webp", "jpeg"],
  } as any,
});

export const uploadProfilePhoto = multer({ storage }).single("profilePhoto");
