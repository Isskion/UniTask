"use client";

import dynamic from "next/dynamic";

// Load the widget without SSR — it uses browser APIs (Notification, localStorage)
const TaskControllerWidget = dynamic(() => import("./TaskControllerWidget"), { ssr: false });

export function ClientShell() {
    return <TaskControllerWidget />;
}
