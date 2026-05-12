"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const MapPicker = dynamic(() => import("./map-picker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px] w-full" />,
});
