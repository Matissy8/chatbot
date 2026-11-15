export type ChatImage = {
  data: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: ChatImage;
};
