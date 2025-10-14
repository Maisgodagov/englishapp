export type LessonBlockType =
  | "text"
  | "media"
  | "quiz"
  | "callout"
  | "list"
  | "embed";

export interface LessonBlockBase<TType extends LessonBlockType> {
  id: string;
  type: TType;
}

export interface LessonBlockText extends LessonBlockBase<"text"> {
  text: string;
  format?: "paragraph" | "heading1" | "heading2" | "quote";
  align?: "left" | "center" | "right";
}

export interface LessonBlockMedia extends LessonBlockBase<"media"> {
  mediaType: "image" | "video" | "audio";
  url: string;
  caption?: string;
  autoplay?: boolean;
  loop?: boolean;
}

export interface LessonBlockQuiz extends LessonBlockBase<"quiz"> {
  question: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  shuffleOptions?: boolean;
}

export interface LessonBlockCallout extends LessonBlockBase<"callout"> {
  title?: string;
  body: string;
  variant?: "info" | "success" | "warning" | "danger";
  icon?: string;
}

export interface LessonBlockList extends LessonBlockBase<"list"> {
  ordered?: boolean;
  items: string[];
}

export interface LessonBlockEmbed extends LessonBlockBase<"embed"> {
  url: string;
  caption?: string;
  provider?: string;
}

export type LessonContentBlock =
  | LessonBlockText
  | LessonBlockMedia
  | LessonBlockQuiz
  | LessonBlockCallout
  | LessonBlockList
  | LessonBlockEmbed;

export interface LessonContent {
  version: string;
  blocks: LessonContentBlock[];
  metadata?: Record<string, unknown>;
}

export interface LessonSummary {
  id: string;
  title: string;
  description?: string;
  xpReward: number;
  durationMinutes?: number | null;
  updatedAt: string;
}

export interface LessonDetail extends LessonSummary {
  content: LessonContent;
  createdAt: string;
}

export interface CreateLessonPayload {
  title: string;
  description?: string;
  xpReward?: number;
  durationMinutes?: number;
  tags?: string[];
  content: LessonContent;
}

export interface ListLessonsResponse {
  items: LessonSummary[];
  nextCursor?: string | null;
}
