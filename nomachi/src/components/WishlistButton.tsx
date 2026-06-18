"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/components/wishlist";
import { Heart } from "lucide-react"; // Assuming you use lucide-react

interface WishlistButtonProps {
  tripId: string;
  initialIsLiked: boolean;
  userId?: string;
}

export default function WishlistButton({ tripId, initialIsLiked, userId }: WishlistButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    if (!userId) {
      router.push(`/login?next=${window.location.pathname}`);
      return;
    }

    setLoading(true);
    setIsLiked(!isLiked); // Optimistic UI update

    const result = await toggleWishlist(tripId);
    if (result.error) {
      setIsLiked(isLiked); // Rollback on error
    }
    setLoading(false);
  };

  return (
    <button onClick={handleToggle} disabled={loading} className="p-2 transition hover:scale-110">
      <Heart className={isLiked ? "fill-red-500 text-red-500" : "text-gray-400"} />
    </button>
  );
}