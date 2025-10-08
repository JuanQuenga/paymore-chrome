import { CSVLink } from "@/src/utils/csv-links";
import { ExternalLink, Folder } from "lucide-react";

interface CSVLinkItemProps {
  link: CSVLink;
  kbdHintAction?: string;
}

export function CSVLinkItem({ link, kbdHintAction }: CSVLinkItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 w-full">
      <div className="flex-shrink-0 w-4 h-4">
        <ExternalLink className="w-4 h-4 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {link.title}
          </p>
          {link.category && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <Folder className="w-3 h-3" />
              {link.category}
            </span>
          )}
        </div>
        {/* Description intentionally hidden per requirements */}
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {link.url}
        </p>
      </div>
      {kbdHintAction && (
        <div className="cmdk-item-kbd-hint">
          <kbd className="cmdk-kbd">↵</kbd>
        </div>
      )}
    </div>
  );
}
