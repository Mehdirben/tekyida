"use client";

import NotebookSwitcher from "@/components/app/NotebookSwitcher";
import QuickStats from "@/components/app/QuickStats";
import EmptyState from "@/components/app/EmptyState";

export default function DashboardPage() {
    // Placeholder — no real notebooks yet
    const notebooks: { id: string; name: string }[] = [];

    return (
        <main className="flex-1 px-4 sm:px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
            {/* Notebook Switcher */}
            <div className="mb-6 animate-slide-up flex justify-center">
                <NotebookSwitcher
                    notebooks={notebooks}
                    activeNotebookId={undefined}
                />
            </div>

            {/* Stats */}
            <div className="mb-6 animate-slide-up delay-100">
                <QuickStats />
            </div>

            {/* Content */}
            <div className="animate-slide-up delay-200">
                <EmptyState />
            </div>
        </main>
    );
}
