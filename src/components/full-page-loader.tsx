"use client";

import Lottie from "lottie-react";
import catLoading from "../../public/lotties/cat-loading.json";

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <Lottie
        animationData={catLoading}
        loop
        className="w-48 h-48"
      />
      <p className="mt-2 text-sm text-muted-foreground tracking-wide">
        Loading workspace...
      </p>
    </div>
  );
}
