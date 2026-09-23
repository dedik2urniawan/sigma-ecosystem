"use client";

import React from "react";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function LiveAnnouncer() {
    const { announcement, announcePriority } = useAccessibility();

    return (
        <div
            role="status"
            aria-live={announcePriority}
            aria-atomic="true"
            className="sr-only"
        >
            {announcement}
        </div>
    );
}
