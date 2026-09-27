"use client";

import { Sun, Monitor, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import SegmentedToggle from "./SegmentedToggle";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <SegmentedToggle<"light" | "system" | "dark">
            value={theme}
            onChange={(next) => setTheme(next)}
            options={[
                { value: "light", icon: Sun, label: "Light", labelMode: "never" },
                { value: "system", icon: Monitor, label: "System", labelMode: "never" },
                { value: "dark", icon: Moon, label: "Dark", labelMode: "never" },
            ]}
        />
    );
}
