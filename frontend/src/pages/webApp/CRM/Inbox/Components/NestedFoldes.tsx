import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

/**
 * Simple data model – two-level deep (folder → items[])
 */
export interface Folder {
  title: string;
  items: string[];
}

interface Props {
  folders: Folder[];
}

/**
 * <NestedFolders /> – a master/detail style vertical panel with two nestable
 * folders of button-like text items.
 *
 * ● Renders a blue “Create” button row at the top (mirrors the screenshot).
 * ● Each folder can be collapsed/expanded. Folder title + chevron act as the toggle.
 * ● Items are rendered as buttons; clicking them logs the item (replace with desired action).
 */
export default function NestedFolders({ folders }: Props) {
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({});

  const toggle = (index: number) =>
    setOpenIndices((prev) => ({ ...prev, [index]: !prev[index] }));

  return (
    <div className="mt-10 w-72 h-[95vh] p-4 rounded-tl-lg rounded-tr-lg flex flex-col bg-white overflow-y-auto select-none">
      {/*── Top action bar ──────────────────────────────────────*/}
      <div className="flex mb-6">
        <button className="flex-1 bg-[#DE1785] hover:bg-pink-700 text-white font-medium rounded-l px-4 py-2 text-sm focus:outline-none">
          Create
        </button>
        <button className="bg-[#DE1785] hover:bg-pink-700 text-white rounded-r px-3 py-2 text-sm focus:outline-none grid place-items-center">
          <Plus size={16} />
        </button>
      </div>

      {/*── Folder list ────────────────────────────────────────*/}
      <ul className="space-y-6">
        {folders.map((folder, idx) => {
          const isOpen = !!openIndices[idx];
          return (
            <li key={folder.title} className="space-y-4">
              {/* Folder header */}
              <button
                onClick={() => toggle(idx)}
                className="flex items-center text-left w-full font-semibold focus:outline-none"
              >
                {isOpen ? (
                  <ChevronDown size={18} className="mr-1" />
                ) : (
                  <ChevronRight size={18} className="mr-1" />
                )}
                {folder.title}
              </button>

              {/* Folder items */}
              {isOpen && (
                <ul className="pl-6 space-y-3">
                  {folder.items.map((item) => (
                    <li key={item}>
                      <button
                        className="text-left w-full hover:bg-gray-100 rounded px-2 py-1 focus:outline-none"
                        onClick={() => console.log("clicked", item)}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/*──────────────────────── Demo data & usage ────────────────────────*/
// Remove or replace this in production
export const Demo = () => (
  // 'all', 'sales', 'logistics' and 'support'
  <NestedFolders
    folders={[
      {
        title: "Inbox",
        items: [
          "All",
          "Sales",
          "Logistics",
          "Support",
        ],
      },
      {
        title: "Customer Support",
        items: ["Tier 1", "Tier 2", "Urgent"],
      },
    ]}
  />
);
