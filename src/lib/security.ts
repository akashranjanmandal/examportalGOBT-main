export const isSecurityEnabled = () => {
  return process.env.NEXT_PUBLIC_DISABLE_SECURITY !== "true";
};

export const isCopyPasteEnabled = () => {
  return process.env.NEXT_PUBLIC_ENABLE_COPY_PASTE === "true";
};
