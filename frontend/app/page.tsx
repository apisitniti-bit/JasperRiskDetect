import { Suspense } from "react";
import IDEShell from "../components/IDEShell";
import { PanelSkeleton } from "../components/skeletons";

export default function Home() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <IDEShell />
    </Suspense>
  );
}
