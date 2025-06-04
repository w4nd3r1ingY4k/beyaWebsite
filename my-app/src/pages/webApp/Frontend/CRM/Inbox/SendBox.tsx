// EmailReplyEditor.tsx
import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
  } from 'react'
  import {
    Editor,
    EditorState,
    RichUtils,
    convertToRaw,
    getDefaultKeyBinding,
    KeyBindingUtil,
    DefaultDraftBlockRenderMap,
  } from 'draft-js'
  import * as Draft from 'draft-js';

  import { Map } from 'immutable'
  import draftToHtml from 'draftjs-to-html'
  import 'draft-js/dist/Draft.css'
  
  // We allow "HIGHLIGHT" as a custom inline style keyword.
  // (Internally, Draft.js will accept inline-style names as plain strings.)
  type MyInlineStyle = 'BOLD' | 'ITALIC' | 'HIGHLIGHT'
  
  // Block types for headers
  type MyBlockType = 'unstyled' | 'header-one' | 'header-two' | 'header-three'
  
  export interface EmailReplyEditorProps {
    /** Controlled EditorState from parent */
    editorState: EditorState
    /** Called when the EditorState changes */
    onChange: (newState: EditorState) => void
    /** Called when user clicks "Send Email" */
    onSend: (html: string) => void
  }
  
  /**
   * EmailReplyEditor
   *
   * - Forwards its ref to the underlying <Editor /> so parent can call .focus() etc.
   * - Renders a toolbar with inline styles (Bold, Italic, Highlight) and block types (Headers).
   * - Renders a "Send Email" button that converts content → HTML and calls onSend(html).
   */
  const EmailReplyEditor = forwardRef<Editor, EmailReplyEditorProps>(
    ({ editorState, onChange, onSend }, ref) => {
      // Internal ref to the Draft.js Editor:
      const internalEditorRef = useRef<Editor | null>(null)
  
      // Expose the internal Editor's methods (e.g. focus()) to the forwarded ref:
      useImperativeHandle(ref, () => internalEditorRef.current as Editor)
  
      // Custom style map so "HIGHLIGHT" shows up with a yellow background:
      const customStyleMap: Record<string, React.CSSProperties> = {
        HIGHLIGHT: {
          backgroundColor: 'yellow',
        },
      }
  
      // Block render map to style headers in the editor
      const blockRenderMap = DefaultDraftBlockRenderMap.merge(
        Map({
          'header-one': {
            element: 'h1',
          },
          'header-two': {
            element: 'h2',
          },
          'header-three': {
            element: 'h3',
          },
        })
      )
  
      // Toggle any of the inline styles:
      function toggleInlineStyle(style: MyInlineStyle) {
        onChange(RichUtils.toggleInlineStyle(editorState, style))
      }
  
      // Toggle block types (headers):
      function toggleBlockType(blockType: MyBlockType) {
        onChange(RichUtils.toggleBlockType(editorState, blockType))
      }
  
      // Get current block type
      const selection = editorState.getSelection()
      const blockType = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getStartKey())
        .getType()
  
      // Conform to Draft.js's keyBindingFn API:
      function keyBindingFn(e: React.KeyboardEvent): string | null {
        if (KeyBindingUtil.hasCommandModifier(e) && e.key.toLowerCase() === 'b') {
          return 'bold'
        }
        if (KeyBindingUtil.hasCommandModifier(e) && e.key.toLowerCase() === 'i') {
          return 'italic'
        }
        if (KeyBindingUtil.hasCommandModifier(e) && e.key.toLowerCase() === 'h') {
          return 'highlight'
        }
        // Add keyboard shortcuts for headers
        if (KeyBindingUtil.hasCommandModifier(e) && e.key === '1') {
          return 'header-one'
        }
        if (KeyBindingUtil.hasCommandModifier(e) && e.key === '2') {
          return 'header-two'
        }
        if (KeyBindingUtil.hasCommandModifier(e) && e.key === '3') {
          return 'header-three'
        }
        return getDefaultKeyBinding(e)
      }
  
      // Conform to Draft.js's handleKeyCommand API:
      function handleKeyCommand(
        command: string,
        _editorState: EditorState
      ): 'handled' | 'not-handled' {
        if (command === 'bold') {
          toggleInlineStyle('BOLD')
          return 'handled'
        }
        if (command === 'italic') {
          toggleInlineStyle('ITALIC')
          return 'handled'
        }
        if (command === 'highlight') {
          toggleInlineStyle('HIGHLIGHT')
          return 'handled'
        }
        if (command === 'header-one') {
          toggleBlockType('header-one')
          return 'handled'
        }
        if (command === 'header-two') {
          toggleBlockType('header-two')
          return 'handled'
        }
        if (command === 'header-three') {
          toggleBlockType('header-three')
          return 'handled'
        }
        return 'not-handled'
      }
  
      // When "Send Email" is clicked, convert content → HTML and call onSend(html)
      function handleSend() {
        const raw = convertToRaw(editorState.getCurrentContent())
        const html = draftToHtml(raw)
        onSend(html)
        // Parent is expected to reset editorState if desired
      }
  
      return (
        <div>
          {/* ─────────── Toolbar ─────────── */}
          <div style={{ marginBottom: 8, display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Inline Styles */}
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleInlineStyle('BOLD')
              }}
              style={{
                fontWeight: editorState
                  .getCurrentInlineStyle()
                  .has('BOLD')
                  ? 'bold'
                  : 'normal',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: editorState.getCurrentInlineStyle().has('BOLD') ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
              }}
              title="Bold (Cmd/Ctrl+B)"
            >
              B
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleInlineStyle('ITALIC')
              }}
              style={{
                fontStyle: editorState
                  .getCurrentInlineStyle()
                  .has('ITALIC')
                  ? 'italic'
                  : 'normal',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: editorState.getCurrentInlineStyle().has('ITALIC') ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
              }}
              title="Italic (Cmd/Ctrl+I)"
            >
              I
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleInlineStyle('HIGHLIGHT')
              }}
              style={{
                backgroundColor: editorState
                  .getCurrentInlineStyle()
                  .has('HIGHLIGHT')
                  ? 'yellow'
                  : '#fff',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="Highlight (Cmd/Ctrl+H)"
            >
              Highlight
            </button>
  
            {/* Separator */}
            <div style={{ width: '1px', height: '20px', background: '#ccc', margin: '0 4px' }} />
  
            {/* Block Types (Headers) */}
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleBlockType('header-one')
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: blockType === 'header-one' ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
              title="Header 1 (Cmd/Ctrl+1)"
            >
              H1
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleBlockType('header-two')
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: blockType === 'header-two' ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
              title="Header 2 (Cmd/Ctrl+2)"
            >
              H2
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleBlockType('header-three')
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: blockType === 'header-three' ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
              title="Header 3 (Cmd/Ctrl+3)"
            >
              H3
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                toggleBlockType('unstyled')
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: blockType === 'unstyled' ? '#e0e0e0' : '#fff',
                cursor: 'pointer',
              }}
              title="Normal text"
            >
              Normal
            </button>
          </div>
  
          {/* ─────────── Draft.js Editor ─────────── */}
          <div
            style={{
              border: '1px solid #ccc',
              minHeight: 120,
              padding: 8,
              borderRadius: 4,
              background: '#fff',
            }}
            onClick={() => internalEditorRef.current?.focus()}
          >
            <style>
              {`
                .DraftEditor-root h1 {
                  font-size: 2em;
                  font-weight: bold;
                  margin: 0.67em 0;
                  line-height: 1.2;
                }
                .DraftEditor-root h2 {
                  font-size: 1.5em;
                  font-weight: bold;
                  margin: 0.75em 0;
                  line-height: 1.3;
                }
                .DraftEditor-root h3 {
                  font-size: 1.17em;
                  font-weight: bold;
                  margin: 0.83em 0;
                  line-height: 1.4;
                }
              `}
            </style>
            <Editor
              editorState={editorState}
              onChange={onChange}
              customStyleMap={customStyleMap}
              handleKeyCommand={handleKeyCommand}
              keyBindingFn={keyBindingFn}
              placeholder="Type your reply…"
              ref={internalEditorRef}
              blockRenderMap={blockRenderMap}
            />
          </div>
  
          <button
            onClick={handleSend}
            style={{
              marginTop: 12,
              background: '#DE1785',
              color: '#fff',
              padding: '8px 16px',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Send Email
          </button>
        </div>
      )
    }
  )
  
  export default EmailReplyEditor