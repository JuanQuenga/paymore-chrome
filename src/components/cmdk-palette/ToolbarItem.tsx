import { ToolbarTool } from "@/src/lib/tools";
import { Wrench } from "lucide-react";

interface ToolbarItemProps {
  tool: ToolbarTool;
  kbdHintAction?: string;
}

export function ToolbarItem({ tool, kbdHintAction }: ToolbarItemProps) {
  const IconComponent = tool.reactIcon || Wrench;

  return (
    <div className="flex items-center gap-3 px-4 py-3 w-full">
      <div className="flex-shrink-0 w-4 h-4">
        {tool.img ? (
          <img
            src={chrome.runtime.getURL(tool.img)}
            alt=""
            className="w-4 h-4 object-contain"
          />
        ) : (
          <IconComponent className="w-4 h-4 text-indigo-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {tool.label}
          </p>
          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            Tool
          </span>
        </div>
        {tool.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {tool.description}
          </p>
        )}
      </div>
      {kbdHintAction && (
        <div className="cmdk-item-kbd-hint">
          <kbd className="cmdk-kbd">↵</kbd>
        </div>
      )}
    </div>
  );
}
