"use client";

import { useEffect } from "react";

export function DatabaseInitializer() {
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Check if we've already initialized in this session
        const hasInitialized = sessionStorage.getItem("db_initialized");
        if (hasInitialized) return;

        console.log("🗄️  Initializing database...");
        
        const response = await fetch("/api/db/init", {
          method: "POST",
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log("✅ Database initialized:", data);
          sessionStorage.setItem("db_initialized", "true");
        } else {
          console.warn("⚠️  Database initialization warning:", data);
          // Still mark as initialized to avoid repeated attempts
          sessionStorage.setItem("db_initialized", "true");
        }
      } catch (error) {
        console.error("❌ Database initialization failed:", error);
        // Don't mark as initialized - will retry on next page load
      }
    };

    initializeDatabase();
  }, []);

  return null;
}
