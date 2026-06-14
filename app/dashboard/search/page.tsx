import { Suspense } from "react";
import SearchPage from "@/components/dashboard/SearchPage";

export default function Search() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
