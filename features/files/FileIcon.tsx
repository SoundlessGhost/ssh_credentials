"use client";

import {
  File as FileIconBase,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileText,
  FileVideo,
  Folder,
} from "lucide-react";

type FileLike = { type: "file" | "folder"; name: string };

const exts = {
  archive: ["zip", "tar", "gz", "tgz", "bz2", "xz", "rar", "7z"],
  code: ["js", "jsx", "ts", "tsx", "py", "go", "rs", "java", "c", "cpp", "h", "rb", "php", "sh", "bash", "zsh", "fish"],
  json: ["json", "yaml", "yml", "toml", "xml"],
  text: ["md", "mdx", "txt", "log", "conf", "ini", "env"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "flv"],
  audio: ["mp3", "wav", "flac", "ogg", "m4a"],
};

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function FileIcon({ item, className }: { item: FileLike; className?: string }) {
  if (item.type === "folder") {
    return <Folder className={`text-amber-500 ${className ?? ""}`} />;
  }
  const ext = extOf(item.name);
  if (exts.archive.includes(ext)) return <FileArchive className={`text-orange-500 ${className ?? ""}`} />;
  if (exts.code.includes(ext)) return <FileCode className={`text-blue-500 ${className ?? ""}`} />;
  if (exts.json.includes(ext)) return <FileJson className={`text-yellow-600 ${className ?? ""}`} />;
  if (exts.text.includes(ext)) return <FileText className={`text-slate-500 ${className ?? ""}`} />;
  if (exts.image.includes(ext)) return <FileImage className={`text-pink-500 ${className ?? ""}`} />;
  if (exts.video.includes(ext)) return <FileVideo className={`text-purple-500 ${className ?? ""}`} />;
  if (exts.audio.includes(ext)) return <FileAudio className={`text-emerald-500 ${className ?? ""}`} />;
  return <FileIconBase className={`text-muted-foreground ${className ?? ""}`} />;
}
