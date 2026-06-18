import { Calendar, CheckCircle2, FileText, Globe, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LeadNote, Profile } from "@/types/admin.types";

export type LeadNoteDisplay = {
  title: string;
  description: string;
};

export const getLeadNoteDisplay = (noteText?: string): LeadNoteDisplay => {
  const text = (noteText || "").trim();

  if (!text) {
    return { title: "Note", description: "" };
  }

  if (text.includes(":")) {
    const parts = text.split(":");
    return {
      title: parts[0].trim() || "Note",
      description: parts.slice(1).join(":").trim(),
    };
  }

  return { title: "Admin", description: text };
};

export const getLeadNoteVisual = (noteText?: string): { iconColor: string; Icon: LucideIcon } => {
  const text = (noteText || "").trim();

  let iconColor = "bg-gray-100 text-gray-500 border-gray-200";
  let Icon = FileText;

  if (text.startsWith("Initial Enquiry")) {
    iconColor = "bg-[#FFEFEA] text-[#FF5B26] border-[#FFD3C4]";
    Icon = Globe;
  } else if (text.startsWith("Called")) {
    iconColor = "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]";
    Icon = Phone;
  } else if (text.startsWith("Vibe Check")) {
    iconColor = "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]";
    Icon = Calendar;
  } else if (text.startsWith("Converted")) {
    iconColor = "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]";
    Icon = CheckCircle2;
  }

  return { iconColor, Icon };
};

export const getLeadNoteAuthorLabel = (
  note: Pick<LeadNote, "author_id" | "created_by">,
  usersById: Map<string, Profile>
) => {
  const authorId = note.created_by || note.author_id || "";
  const profile = authorId ? usersById.get(authorId) : undefined;

  if (!profile) {
    return "Unknown";
  }

  const role = (profile.role || "USER").toLowerCase();
  return role === "admin" ? "Admin" : role === "manager" ? "Manager" : role === "staff" ? "Staff" : "User";
};

