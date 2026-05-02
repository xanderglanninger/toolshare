"use client";

import { Suspense } from "react";
import Profile from "@/components/dashboard/Profile";
import { useDashboard } from "../context";

function SettingsContent() {
  const { setUserImage, theme, toggleTheme } = useDashboard();
  return (
    <Profile
      onImageUpdate={(url) => setUserImage(url)}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
