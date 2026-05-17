let pendingFile: File | null = null;

export function setPendingFile(file: File | null) {
  pendingFile = file;
}

export function takePendingFile(): File | null {
  const f = pendingFile;
  pendingFile = null;
  return f;
}
