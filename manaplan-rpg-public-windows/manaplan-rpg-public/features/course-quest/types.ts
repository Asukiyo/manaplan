export type Filters = {
  name: string;
  time: string;
  code: string;
  credits: string;
  courseType: string;
  location: string;
};

export type ChatMessage = { role: "user" | "bot"; text: string };

export const emptyFilters: Filters = {
  name: "",
  time: "",
  code: "",
  credits: "",
  courseType: "",
  location: "",
};
