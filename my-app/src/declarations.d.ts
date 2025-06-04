// // src/declarations.d.ts
  
//   // If @types/draftjs-to-html is missing:
//   declare module "draftjs-to-html" {
//     const draftToHtml: any;
//     export default draftToHtml;
//   }
  
//   // If @types/react-slick is missing:
//   declare module "react-slick" {
//     import { ComponentType } from "react";
//     const Slider: ComponentType<any>;
//     export default Slider;
//   }
  
//   // If lucide-react ships no types, or TS still complains:
//   declare module "lucide-react" {
//     import { ComponentType, SVGProps } from "react";
//     // If you import named icons, e.g. `import { Home } from "lucide-react";`
//     export const ArrowDownCircle: ComponentType<SVGProps<SVGSVGElement>>;
//   export const ChevronDown:        ComponentType<SVGProps<SVGSVGElement>>;
//   export const ChevronRight:       ComponentType<SVGProps<SVGSVGElement>>;
//   export const Plus:               ComponentType<SVGProps<SVGSVGElement>>;
//   export const Send:               ComponentType<SVGProps<SVGSVGElement>>;
//   export const Mic:                ComponentType<SVGProps<SVGSVGElement>>;
//   export const ArrowUp:            ComponentType<SVGProps<SVGSVGElement>>;
//     export const Home: ComponentType<SVGProps<SVGSVGElement> & { [key: string]: any }>;
//     export const User: ComponentType<SVGProps<SVGSVGElement> & { [key: string]: any }>;
//     // …and so on for each icon you use.
//   }

//   // src/declarations.d.ts

// // …(your lucide-react declarations from Step 1)…

// // —————— draft-js shims ——————
// declare module "draft-js" {
//   import { ComponentType } from "react";

//   // Editor is a React component.
//   export const Editor: ComponentType<any>;

//   // EditorState is a class with static methods and instance methods.
//   export class EditorState {
//     // Static creation methods
//     static createEmpty(): EditorState;
//     // (Add other static methods if you use them, e.g. createWithContent)

//     // Instance methods
//     getCurrentContent(): any;           // At runtime, returns a ContentState
//     getSelection(): any;                // Returns a SelectionState
//     getCurrentInlineStyle(): any;       // Returns an Immutable Set (OrderedSet<string>)
//     // (Add other instance methods you use, e.g. getBlockMap(), etc.)
//   }

//   // RichUtils is a namespace with utility functions to toggle styles/blocks.
//   export namespace RichUtils {
//     function toggleInlineStyle(
//       editorState: EditorState,
//       style: string
//     ): EditorState;
//     function toggleBlockType(
//       editorState: EditorState,
//       blockType: string
//     ): EditorState;
//     // (Add other methods if you call them)
//   }

//   // Convert an EditorState to a raw JS representation.
//   export function convertToRaw(state: any): any;

//   // Returns a default key-binding string or null.
//   export function getDefaultKeyBinding(e: any): string | null;

//   // KeyBindingUtil has helpers such as hasCommandModifier.
//   export namespace KeyBindingUtil {
//     function hasCommandModifier(e: any): boolean;
//     // (Add other methods if you use them)
//   }

//   // The default block‐render map is an Immutable Map.
//   export const DefaultDraftBlockRenderMap: Map<any, any>;

//   // If you use other helpers like ContentState, Modifier, etc., add them here:
//   // export class ContentState { /* … */ }
//   // export namespace Modifier { /* … */ }
//   // export class SelectionState { /* … */ }
//   // etc.
// }
  