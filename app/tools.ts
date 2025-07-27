import { uploadBytes, getDownloadURL, StorageReference } from "firebase/storage";
import imageCompression from "browser-image-compression";

export async function compressImage(file: File, options: { maxSizeMB: number; maxWidthOrHeight: number; useWebWorker?: boolean }) {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Image compression timed out after 10 seconds")), 10000)
    );
    const compressedFile = await Promise.race([
      imageCompression(file, {
        maxSizeMB: options.maxSizeMB,
        maxWidthOrHeight: options.maxWidthOrHeight,
        useWebWorker: options.useWebWorker ?? true,
      }),
      timeoutPromise,
    ]);
    console.log(`Compressed image from ${file.size / 1024 / 1024} MB to ${compressedFile.size / 1024 / 1024} MB`);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

export async function uploadImage(storageRef: StorageReference, file: File) {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Image upload timed out after 10 seconds")), 10000)
    );
    const startTime = performance.now();
    const uploadResult = await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
    const url = await getDownloadURL(storageRef);
    const duration = performance.now() - startTime;
    console.log(`Uploaded image in ${duration / 1000} seconds`);
    return url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}