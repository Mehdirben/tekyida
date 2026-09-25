"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

interface AuthSubmitButtonProps {
    loading: boolean;
    label: string;
    disabled?: boolean;
}

export default function AuthSubmitButton({
    loading,
    label,
    disabled = false,
}: AuthSubmitButtonProps) {
    return (
        <div className="pt-2">
            <Button type="submit" size="lg" className="w-full" disabled={loading || disabled}>
                {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <>
                        {label}
                        <ArrowRight size={16} />
                    </>
                )}
            </Button>
        </div>
    );
}
