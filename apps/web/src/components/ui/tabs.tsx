"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Pill chips that scroll sideways; the fade shows there are more.
        "fade-end flex scroll-px-4 items-center gap-2 overflow-x-auto [scrollbar-width:none]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "h-11 shrink-0 rounded-full border border-line px-4 text-sm font-medium text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:font-semibold data-[state=active]:text-paper",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
