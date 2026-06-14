import { TextInputProps, TouchableOpacityProps } from "react-native";

// ─── UI Component Props ────────────────────────────────────────────────────────

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  bgVariant?: "primary" | "secondary" | "danger" | "outline" | "success" | "amber" | "red";
  textVariant?: "primary" | "default" | "secondary" | "danger" | "success" | "amber" | "red";
  IconLeft?: React.ComponentType<any>;
  IconRight?: React.ComponentType<any>;
  className?: string;
  loading?: boolean;
}

export interface InputFieldProps extends TextInputProps {
  label?: string;
  icon?: any;
  iconRight?: any;
  secureTextEntry?: boolean;
  labelStyle?: string;
  containerStyle?: string;
  inputStyle?: string;
  iconStyle?: string;
  className?: string;
  error?: string;
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar?: string;
}

export interface AuthStore {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
}

// ─── Message Types ───────────────────────────────────────────────────────────

export type MessageState = "SENDING" | "SENT" | "DELIVERED" | "SEEN";
export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "VOICE" | "NOTIFICATION" | "SYSTEM";

export interface ChatMessage {
  id: string;
  chatId?: string;
  senderId: string;
  senderName?: string;
  avatar?: string;
  content?: string;
  text?: string;
  image?: string;
  mediaUrl?: string;
  fileName?: string;
  time: string;
  createdAt?: string;
  type: MessageType;
  state?: MessageState;
  reactions?: Array<{ emoji: string; userId: string; userFullName?: string }>;
  deleted?: boolean;
  pinned?: boolean;
  replyTo?: { id: string; content?: string; senderName?: string; mediaUrl?: string; type?: MessageType };
}
