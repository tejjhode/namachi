"use client";

import { useRouter } from "next/navigation";
import AdminView from "@/components/AdminView";

interface AdminPageClientProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
}

export function AdminPageClient({ user }: AdminPageClientProps) {
  const router = useRouter();

  return (
    <AdminView
      user={user}
      initialTab="trips"
      onBack={() => {
        router.push("/");
      }}
    />
  );
}
