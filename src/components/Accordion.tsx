import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

interface AccordionItem {
    key: string;
}

interface AccordionProps<T extends AccordionItem> {
    items: T[];
    renderTrigger: (item: T, isExpanded: boolean) => ReactNode;
    renderContent: (item: T) => ReactNode;
    renderAction?: (item: T) => ReactNode;
    type?: "single" | "multi";
}

export function Accordion<T extends AccordionItem>({
    items,
    renderTrigger,
    renderContent,
    renderAction,
    type = "single",
}: AccordionProps<T>) {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    function toggle(key: string) {
        setExpandedKeys((prev) => {
            if (type === "single") {
                return prev.has(key) ? new Set() : new Set([key]);
            }
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }

    return (
        <div className="flex flex-col gap-1">
            {items.map((item) => {
                const isExpanded = expandedKeys.has(item.key);

                return (
                    <div key={item.key}>
                        <div className="flex items-center gap-1 py-2.5">
                            <button
                                type="button"
                                onClick={() => toggle(item.key)}
                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg pr-3  text-left transition hover:bg-(--surface)"
                            >
                                {type === "multi" ? (
                                    <ChevronDown
                                        size={16}
                                        className={`text-(--sea-ink-soft) transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                    />
                                ) : isExpanded ? (
                                    <ChevronDown size={16} className="text-(--sea-ink-soft)" />
                                ) : (
                                    <ChevronRight size={16} className="text-(--sea-ink-soft)" />
                                )}
                                {renderTrigger(item, isExpanded)}
                            </button>
                            {renderAction?.(item)}
                        </div>

                        {isExpanded && (
                            <div className="lg:ml-8 mb-2">{renderContent(item)}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
