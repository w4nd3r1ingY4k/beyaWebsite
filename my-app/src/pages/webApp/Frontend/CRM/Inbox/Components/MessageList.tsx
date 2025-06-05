import React, { useState, useEffect, useMemo, useRef } from 'react'
import MessageBox from './MessageBox'
import { Message } from '../Types'
import { EditorState, convertToRaw, Editor } from 'draft-js'
import draftToHtml from 'draftjs-to-html'
import { useAuth } from '../../../../../AuthContext'
import EmailReplyEditor from '../SendBox'
import TemplateModal from './TemplateModal'

// ─────────── Constants ───────────
// Base URL for your API (include /prod stage)
const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod'

// ─────────── Types and Interfaces ───────────
type Channel = 'whatsapp' | 'email'

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
}

interface TeamMessage {
  flowId: string;      // the flow this comment belongs to
  commentId: string;   // unique ID for this comment
  authorId: string;    // who wrote it
  authorName: string;  // human‐readable name
  text: string;        // the comment body
  createdAt: string;   // ISO timestamp
}

type Status = 'open' | 'waiting' | 'resolved' | 'overdue'
type ViewFilter = "owned" | "sharedWithMe" | "sharedByMe";


const MessageList: React.FC<Props> = ({ selectedId, onSelect }) => {
  // ─────────── Authentication Context ───────────
  const { user } = useAuth()
  // `user.userId` identifies the owner; we'll use it to only show their flows

  // ─────────── Component State ───────────
  const [threads, setThreads] = useState<string[]>([]) // Raw list of all thread IDs from the webhook endpoint
  const [chatMessages, setChatMessages] = useState<Message[]>([]) // Messages for the currently selected chat
  const [isReplying, setIsReplying] = useState(false) // Controls reply overlay visibility
  const [replyText, setReplyText] = useState('') // Text content for replies
  const [replySubject, setReplySubject] = useState('') // Subject for email replies
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]) // Internal team chat messages
  const [teamChatInput, setTeamChatInput] = useState('') // Input for internal team chat
  const [loading, setLoading] = useState(false) // Loading state for chat messages
  const [error, setError] = useState<string | null>(null) // Error state for API calls
  const [flows, setFlows] = useState<any[]>([]) // All flows fetched from the API
  const [viewFilter, setViewFilter] = useState<ViewFilter>("owned");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)

  const [emailEditorState, setEmailEditorState] = useState<EditorState>(
    () => EditorState.createEmpty()
  )
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false); // Controls template modal visibility
  const [isComposing, setIsComposing] = useState(false);
const [composeChannel, setComposeChannel] = useState<Channel>("email"); 
const [composeTo, setComposeTo] = useState(""); 
const [composeBody, setComposeBody] = useState("");
const [composeSubject, setComposeSubject] = useState(""); // only used if composeChannel==="email"

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>('all') // Renamed from flowFilter for clarity, default to 'all'
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')

  // Dropdown states
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // ─────────── Refs for Dropdowns ───────────
  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const emailEditorRef = useRef<Editor | null>(null)
  // ─────────── Hardcoded Data & Options ───────────
  const currentUser = 'You' // Represents the logged-in user sending messages
  // Removed 'all' from tagOptions as 'all' is a filter option, not a tag to assign
  const tagOptions = ['sales', 'logistics', 'support']

  // ─────────── Derived Data (Memoized for Performance) ───────────
  // Flows belonging to the current authenticated user
  const myFlows = useMemo(
    () => flows.filter(f => f.contactId === user?.userId),
    [flows, user?.userId]
  )

  // A set of flowIds this user owns, for quick lookup
  const ownedFlows = useMemo(() => {
    return flows.filter(f => f.contactId === user?.userId);
  }, [flows, user?.userId]);
  
  // 2) Flows shared with me (I appear in participants, but I’m not the owner)
  const sharedWithMe = useMemo(() => {
    return flows.filter(f =>
      Array.isArray(f.participants)
      && f.participants.includes(user!.userId)
      && f.contactId !== user!.userId
    );
  }, [flows, user?.userId]);
  
  // 3) Flows I have shared (I am the owner and participants exists & is non‐empty)
  const sharedByMe = useMemo(() => {
    return ownedFlows.filter(f =>
      Array.isArray(f.participants) && f.participants.length > 0
    );
  }, [ownedFlows]);

  // Filter options for categories (tags) available based on user's flows
  const categoryFilterOptions = useMemo(() => {
    const options = new Set<string>();
    options.add('all'); // Always show 'all' filter option
    // 'inbox' is now a dedicated button, so remove from here to avoid redundancy
    myFlows.forEach(f => {
      if (f.category) {
        options.add(f.category.toLowerCase());
      }
    });
    return Array.from(options).sort(); // Convert to array and sort
  }, [myFlows]);

  // The currently selected flow object (for showing status/tag, etc.)
  

  const selectedFlow = useMemo(() => {
  let setToUse: any[] = [];
  if (viewFilter === "owned") {
    setToUse = ownedFlows;
  } else if (viewFilter === "sharedWithMe") {
    setToUse = sharedWithMe;
  } else {
    setToUse = sharedByMe;
  }
  return setToUse.find(f => f.flowId === selectedId);
}, [ownedFlows, sharedWithMe, sharedByMe, selectedId, viewFilter]);

  // Filtered threads displayed in the sidebar based on category and status filters
  const filteredThreads = useMemo(() => {
    let baseFlows: any[] = [];
    if (viewFilter === "owned") {
      baseFlows = ownedFlows;
    } else if (viewFilter === "sharedWithMe") {
      baseFlows = sharedWithMe;
    } else {
      baseFlows = sharedByMe;
    }
  
    const baseFlowIds = new Set(baseFlows.map(f => f.flowId));
    let result = threads.filter(id => baseFlowIds.has(id));
  
    if (categoryFilter !== "all") {
      const matching = new Set(
        baseFlows
          .filter(
            f =>
              typeof f.category === "string" &&
              f.category.toLowerCase() === categoryFilter.toLowerCase()
          )
          .map(f => f.flowId)
      );
      result = result.filter(id => matching.has(id));
    }
  
    if (statusFilter !== "all") {
      const matching = new Set(
        baseFlows.filter(f => f.status === statusFilter).map(f => f.flowId)
      );
      result = result.filter(id => matching.has(id));
    }
  
    return result;
  }, [
    threads,
    ownedFlows,
    sharedWithMe,
    sharedByMe,
    categoryFilter,
    statusFilter,
    viewFilter,
  ]);

  

  // ─────────── Effects ───────────

  // Effect to handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const ownedFlowIds = useMemo(() => {
    return new Set(myFlows.map(f => f.flowId));
  }, [myFlows]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1]
      // If `lastMsg.id` could be undefined, this forces it into `string | null`
      setActiveMessageId(lastMsg.id!)
    } else {
      setActiveMessageId(null)
    }
  }, [chatMessages])
  // Effect to fetch flows and threads on component mount or user change
  useEffect(() => {
    if (!user) return

    // 1) Load all flows, then filter
    fetch(`${API_BASE}/flows`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
        .then(data => {
            // Keep every flow in state; we will split owned vs. shared in render logic
            setFlows(data.flows || []);
          })
      .catch(err => console.error('Error loading flows:', err))

    // 2) Load the canonical list of thread IDs
    fetch(`${API_BASE}/webhook/threads`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        const ts: string[] = data.threads || []
        setThreads(ts)
        // If no selectedId, select the first thread belonging to the user's flows
        if (ts.length && !selectedId) {
          const firstOwnedThread = ts.find(id =>
            ownedFlows.some(f => f.flowId === id)
          );
          if (firstOwnedThread) onSelect(firstOwnedThread)
          else if (ts.length > 0) onSelect(ts[0]) // Fallback to first if no owned found initially (race condition)
        }
      })
      .catch(err => {
        console.error('Failed to fetch threads:', err)
        setError('Failed to load conversations')
      })
  }, [user, onSelect, selectedId, ownedFlowIds])

  // ─────────── Load internal comments whenever selectedId (flowId) changes ───────────
  useEffect(() => {
    if (!selectedId) {
      setTeamMessages([]);
      return;
    }
  
    setLoading(true);
    setError(null);
  
    fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${encodeURIComponent(selectedId)}/comments`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { comments: TeamMessage[] }) => {
        setTeamMessages(data.comments);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load internal comments:", err);
        setError("Could not load internal comments");
        setTeamMessages([]);
        setLoading(false);
      });
  }, [selectedId]);

  // Effect to fetch messages for selected thread and load internal team chat
  useEffect(() => {
    if (!selectedId) {
      setChatMessages([]) // Clear messages if no thread is selected
      setTeamMessages([]) // Clear team messages too
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/webhook/threads/${encodeURIComponent(selectedId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        let raw: any[] = []
        if (Array.isArray(data)) {
          raw = data
        } else if (data.messages) {
          raw = data.messages
        } else if (data.Items) {
          raw = data.Items
        } else if (data.items) {
          raw = data.items
        } else if (typeof data === 'object' && Object.keys(data).length > 0) {
          // If a single object is returned, wrap it in an array
          raw = [data]
        }

        const msgs: Message[] = raw.map(m => {
          const dir =
            m.Direction?.toLowerCase() === 'outgoing' ||
            m.direction === 'outgoing'
              ? 'outgoing'
              : 'incoming'
          const sender =
            dir === 'outgoing'
              ? currentUser
              : m.ThreadId || m.from || m.sender || 'Unknown' // Prioritize ThreadId, then common sender fields
          const getField = (f: string) =>
            m[f] ?? m[f.charAt(0).toUpperCase() + f.slice(1)] ?? ''

          return {
            id: getField('MessageId') || Date.now().toString() + Math.random().toString(36).substring(2, 9), // Ensure unique IDs
            threadId: m.ThreadId || selectedId,
            channel: getChannel(selectedId),
            direction: dir,
            senderName: sender,
            preview: getField('body')?.slice(0, 120) || '', // Ensure preview is string
            subject: m.subject || '',
            body: getField('body') || '', // Ensure body is string
            timestamp: new Date(+m.Timestamp || Date.now()).toISOString(),
            isClosed: false, // Default or derived from flow status
            senderAvatar: undefined, // No avatar in this context
            originalMessageId: getField('MessageId')

          }
        })

        // Sort messages by timestamp, oldest first
        setChatMessages(msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch messages:', err)
        setError(`Failed to load messages: ${err.message}`)
        setChatMessages([])
        setLoading(false)
      })

    // Load internal team chat from localStorage
    const saved = localStorage.getItem(`team-chat-${selectedId}`)
    setTeamMessages(saved ? JSON.parse(saved) : [])
  }, [selectedId, currentUser]) // Added currentUser to deps


  // ─────────── Helper Functions ───────────

  // Detect channel by thread ID (simple check for '@' for email)
  function getChannel(id: string): Channel {
    return id.includes('@') ? 'email' : 'whatsapp'
  }

  /**
   * PATCH any fields on a flow via your Lambda URL
   */
  async function updateFlow(flowId: string, updates: Record<string, any>) {
    // Ensure userId is present in updates
    const payload = {
      ...updates,
      userId: user!.userId // Add userId from auth context
    };

    const FUNCTION_URL =
      'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws';

    const res = await fetch(
      `${FUNCTION_URL}/flows/${encodeURIComponent(flowId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // Inside your React component (e.g. MessageList.tsx)

async function addParticipant(flowId: string, newEmail: string) {
  // 1) Find the flow object in local state
  const flowObj = flows.find(f => f.flowId === flowId);
  if (!flowObj) {
    throw new Error("Flow not found");
  }

  // 2) Lookup the userId for `newEmail`
  //    Assumes your GET /users/email?email=... endpoint returns { userId, ... } on success
  let lookupResponse: Response;
  try {
    lookupResponse = await fetch(`${API_BASE}/users/email?email=${encodeURIComponent(newEmail)}`);
  } catch (networkErr) {
    console.error("Network error while looking up email:", networkErr);
    throw new Error("Could not reach user‐lookup service");
  }

  if (lookupResponse.status === 404) {
    // The user wasn’t found in the Users table
    throw new Error(`No user found with email "${newEmail}"`);
  }

  if (!lookupResponse.ok) {
    // Some other error (500, etc.)
    const errBody = await lookupResponse.text().catch(() => null);
    console.error("Error from user‐lookup endpoint:", lookupResponse.status, errBody);
    throw new Error("Error looking up user by email");
  }

  // 3) Parse the JSON to get the userId
  const userRecord = (await lookupResponse.json()) as { userId: string; [key: string]: any };
  const newUserId = userRecord.userId;
  if (!newUserId) {
    console.error("Lookup returned no userId:", userRecord);
    throw new Error("Invalid lookup result: missing userId");
  }

  // 4) Grab existing participants (userIds) or default to empty array
  const existing: string[] = Array.isArray(flowObj.participants)
    ? flowObj.participants
    : [];

  // 5) Dedupe via a Set, then add the new userId
  const deduped = new Set(existing);
  deduped.add(newUserId);

  // 6) Convert back to array
  const updatedParticipants = Array.from(deduped);

  // 7) Call updateFlow, sending the full deduped array of userIds
  let updatedFlowData: any;
  try {
    const { updated } = await updateFlow(flowId, {
      participants: updatedParticipants,
    });
    updatedFlowData = updated;
  } catch (updateErr: any) {
    console.error("Error updating flow participants:", updateErr);
    throw new Error("Could not update flow participants");
  }

  // 8) Update local React state so the UI refreshes
  setFlows(allFlows =>
    allFlows.map(f => (f.flowId === updatedFlowData.flowId ? updatedFlowData : f))
  );
}

  // ─────────── Event Handlers ───────────

  // Handles updating the category (tag) of the selected flow
  const handleTagSelect = async (tag: string) => {
    setShowTagDropdown(false) // Close dropdown
    setTagSearch('') // Clear search input

    if (!selectedId) {
      alert('Please select a conversation first.')
      return
    }
    const flowToUpdate = myFlows.find(f => f.flowId === selectedId)
    if (!flowToUpdate) {
      console.error('No flow found for selectedId:', selectedId)
      return
    }
    try {
      // Call updateFlow with the new category (tag)
      const { updated } = await updateFlow(flowToUpdate.flowId, { category: tag })
      // Update local state with the new flow data
      setFlows(fs =>
        fs.map(f => (f.flowId === updated.flowId ? updated : f))
      )
    } catch (err: any) {
      console.error('Failed to update category:', err)
      alert('Could not update category: ' + err.message)
    }
  }
// Add this helper function inside your component (but before the return statement)
function linkifyWithImages(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    const match = part.match(urlRegex);
    if (!match) return part;

    let url = match[0];
    let trailing = '';

    // strip trailing punctuation
    while (
      url.length > 0 &&
      [')', ']', '}', ',', '.', '!', '?'].includes(url[url.length - 1])
    ) {
      trailing = url[url.length - 1] + trailing;
      url = url.slice(0, -1);
    }

    // now test for image‐extension + optional query string
    if (/\.(jpe?g|png|gif|webp|svg)(?:\?.*)?$/i.test(url)) {
      return (
        <React.Fragment key={index}>
          <img
            src={url}
            alt=""
            style={{ maxWidth: '100%', display: 'block', margin: '8px 0' }}
          />
          {trailing}
        </React.Fragment>
      );
    }

    // otherwise render as normal link
    return (
      <React.Fragment key={index}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#007bff' }}
        >
          {url}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}
  // Handles updating the status of the selected flow
  const handleStatusSelect = async (status: Status) => {
    setShowStatusDropdown(false) // Close dropdown

    if (!selectedId) return
    const flowObj = myFlows.find(f => f.flowId === selectedId)
    if (!flowObj) return

    try {
      // Call updateFlow with the new status
      const { updated } = await updateFlow(flowObj.flowId, { status })
      // Update local state with the new flow data
      setFlows(fs =>
        fs.map(f => (f.flowId === updated.flowId ? updated : f))
      )
    } catch (err: any) {
      console.error('Failed to update status:', err)
      alert(`Could not update status: ${err.message}`)
    }
  }

  // Sends a WhatsApp message via API
  async function sendWhatsAppMessage(to: string, body: string) {
    const res = await fetch(`${API_BASE}/send/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: body, userId: user!.userId }), // Include userId
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  // Sends an Email message via API
 // In your React client (e.g. SendBox or wherever you call sendEmailMessage):

async function sendEmailMessage(
  to: string,
  subject: string,
  plainText: string,
  htmlContent: string,
  originalMessageId?: string   // ← NEW optional parameter
) {
  // Build the payload
  const payload: any = {
    to,
    subject,
    text: plainText,    // plain‐text fallback
    html: htmlContent,  // HTML version
    userId: user!.userId
  };

  // If we're replying to an existing message, include its Message‐ID:
  if (originalMessageId) {
    payload.originalMessageId = originalMessageId;
  }

  const res = await fetch(`${API_BASE}/send/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

  // Handles sending a reply to the customer
  const handleReplySend = async () => {
    const channel = getChannel(selectedId!!);
    try {
      if (channel === 'whatsapp') {
        if (!replyText.trim()) return;
        await sendWhatsAppMessage(selectedId!!, replyText);
      } else {
        // For email, pull HTML from Draft.js
        const contentState = emailEditorState.getCurrentContent();
        const plainText = contentState.getPlainText();
        const raw = convertToRaw(contentState);
        const htmlBody = draftToHtml(raw);
  
        // Assume you saved the original Message‐ID on the selected thread
        const incoming = chatMessages.find(msg => msg.direction === 'incoming');
const originalMessageId = incoming?.originalMessageId;
  
        await sendEmailMessage(
          decodeURIComponent(selectedId!!),
          replySubject,
          plainText,
          htmlBody,
          originalMessageId  // <-- pass it here
        );
      }
  
      // …reset UI…
      if (channel === 'email') {
        setEmailEditorState(EditorState.createEmpty());
        setReplySubject('');
      } else {
        setReplyText('');
      }
      setIsReplying(false);
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply: ' + err.message);
    }
  };

  // Handles sending an internal team chat message
  const handleTeamChatSend = async () => {
  if (!selectedId || !teamChatInput.trim()) return;

  const safeId = encodeURIComponent(selectedId);

let postRes: Response;
try {
  postRes = await fetch(
    `https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${safeId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorId:   user!.userId,
        authorName: user!.displayName || user!.email || "Unknown",
        text:       teamChatInput.trim(),
      })
    }
  );
} catch (networkErr) {
  console.error("Network error posting comment:", networkErr);
  alert("Could not reach comments service");
  return;
}

if (!postRes.ok) {
  const errText = await postRes.text().catch(() => "");
  console.error("Error from POST comments:", postRes.status, errText);
  alert("Could not post comment");
  return;
}

const newComment = await postRes.json() as TeamMessage;
setTeamMessages(prev => [...prev, newComment]);
setTeamChatInput("");
};

  // ─────────── Render Method ───────────
  return (
    <div style={{ height: '100vh', backgroundColor: '#FFFBFA', width: '100%', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
      {/* ─── Main Content Area: Inbox Button, Sidebar (Thread List), and Chat Pane ─── */}
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
<div
  style={{
    width: "23vh",
    backgroundColor: "#FFFBFA",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: '3.5vh',
    padding: 10
  }}
>
  {/* ─── Inbox (Owned) ─── */}
  <button
    onClick={() => {
      setComposeChannel("email");   // default to email
    setComposeTo("");
    setComposeBody("");
    setComposeSubject("");
    setIsComposing(true);
    }}
    style={{
      width: "calc(100% - 8px)",
      margin: "4px 0",
      padding: "10px 0",
      background: "#de1785",
      border: "1px solid transparent",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      color: "#fff",
      textAlign: "center",
    }}
  >
    Compose
  </button>
  <button
    onClick={() => {
      setViewFilter("owned");
      setCategoryFilter("all"); // optional: reset category when switching
      setStatusFilter("all");   // optional: reset status when switching
    }}
    style={{
      width: "calc(100% - 8px)",
      margin: "4px 0",
      padding: "10px 0",
      background: viewFilter === "owned" ? "#EAE5E5" : "transparent",
      border: "1px solid transparent",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      color: "#374151",
      textAlign: "start",
      transition: "background 0.18s",
    }}
    onMouseEnter={e => {
      if (viewFilter !== "owned") e.currentTarget.style.background = "#f3e0f0";
    }}
    onMouseLeave={e => {
      if (viewFilter !== "owned") e.currentTarget.style.background = "transparent";
    }}
  >
    Inbox
  </button>

  {/* ─── Shared With Me ─── */}
  <button
    onClick={() => {
      setViewFilter("sharedWithMe");
      setCategoryFilter("all"); // optional: reset category filter
      setStatusFilter("all");   // optional: reset status filter
    }}
    style={{
      width: "calc(100% - 8px)",
      margin: "4px 0",
      padding: "10px 0",
      background: viewFilter === "sharedWithMe" ? "#EAE5E5" : "transparent",
      border: "1px solid transparent",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      color: "#374151",
      textAlign: "start",
      transition: "background 0.18s",
    }}
    onMouseEnter={e => {
      if (viewFilter !== "sharedWithMe") e.currentTarget.style.background = "#f3e0f0";
    }}
    onMouseLeave={e => {
      if (viewFilter !== "sharedWithMe") e.currentTarget.style.background = "transparent";
    }}
  >
    Shared With Me
  </button>
  <button
    onClick={() => {
      setViewFilter("sharedByMe");
      setCategoryFilter("all");
      setStatusFilter("all");
    }}
    style={{
      width: "calc(100% - 8px)",
      margin: "4px 0",
      padding: "10px 0",
      background: viewFilter === "sharedByMe" ? "#EAE5E5" : "transparent",
      border: "1px solid transparent",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      color: "#374151",
      textAlign: "start",
      transition: "background 0.18s",
    }}
    onMouseEnter={e => {
      if (viewFilter !== "sharedByMe") e.currentTarget.style.background = "#f3e0f0";
    }}
    onMouseLeave={e => {
      if (viewFilter !== "sharedByMe") e.currentTarget.style.background = "transparent";
    }}
  >
    Shared
  </button>
</div>

        {/* Container for header controls and thread list/chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* ─── Top header: Status & Action Controls ─── */}
          <div
            style={{
              padding: '0px 2px',
              paddingTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 30,
              marginBottom: 5,
            }}
          >
            {/* Status filter buttons */}
            <div
              style={{
              display: 'flex',
              fontSize: '15px',
              gap: '12px',
              alignItems: 'center',
              marginTop: 10,
              marginLeft: 0,
              }}
            >
              <button
              onClick={() => setStatusFilter('all')}
              style={{
                background: statusFilter === 'all' ? '#f3f4f6' : 'transparent',
                border: 'none',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '17px',
                color: '#374151',
              }}
              >
              All
              </button>
              {(['open', 'waiting', 'resolved', 'overdue'] as Status[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                background: 'transparent',
                border: 'none',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '17px',
                color: '#374151',
                borderRadius: '4px',
                position: 'relative',
                outline: 'none',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                {statusFilter === s && (
                <span
                  style={{
                  display: 'block',
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  bottom: -4, // add space between button and colored span
                  height: 6,
                  background:
                    s === 'open'
                    ? '#10b981' // Green
                    : s === 'waiting'
                    ? '#f59e0b' // Yellow
                    : s === 'resolved'
                    ? '#6b7280' // Gray
                    : '#ef4444', // Red
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  zIndex: 0,
                  }}
                />
                )}
              </button>
              ))}
            </div>
          
            {/* Right-side action buttons and dropdowns */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Status dropdown */}
              <div style={{ position: 'relative' }} ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                >
                  {selectedFlow?.status?.charAt(0).toUpperCase() + selectedFlow?.status?.slice(1) || 'Select Status'}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 8l5 5 5-5"
                      stroke="#374151"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {showStatusDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
                      minWidth: '140px',
                      zIndex: 1000,
                      overflow: 'hidden',
                    }}
                  >
                    {(['open', 'waiting', 'resolved', 'overdue'] as Status[]).map(s => (
                      <div
                        key={s}
                        onClick={() => handleStatusSelect(s)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#374151',
                          background: selectedFlow?.status === s ? '#f3f4f6' : 'transparent', // Highlight based on flow's actual status
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = selectedFlow?.status === s ? '#f3f4f6' : 'transparent') // Highlight based on flow's actual status
                        }
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background:
                              s === 'open'
                                ? '#10b981' // Green
                                : s === 'waiting'
                                ? '#f59e0b' // Yellow
                                : s === 'resolved'
                                ? '#6b7280' // Gray
                                : '#ef4444', // Red
                          }}
                        />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual refresh button */}
              <button
                // Add actual refresh logic here if needed, e.g., re-fetching threads/flows
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </button>

              {/* Delete/clear button (if desired) */}
              <button
                // Add actual delete logic here if needed
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3,6 5,6 21,6" />
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* ─── Category Filter tabs & Info Header ─── */}
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'flex-start', // Center the container
              alignItems: 'center',
              width: '100%',
              backgroundColor: '#FBF7F7'
            }}
          >
            {/* Category (Tag) filter buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#374151', fontWeight: 'bold' }}>Filter:</span>
              {categoryFilterOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    background: categoryFilter === cat ? '#f3f4f6' : 'transparent',
                    border: 'none',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    borderRadius: '4px',
                  }}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
              {/* "Newest" button - functionality not implemented in this change */}
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  borderRadius: '4px',
                }}
              >
                Newest
              </button>
            </div>

            {/* Tag & Assign buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Tag dropdown */}
              <div style={{ position: 'relative' }} ref={tagDropdownRef}>
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Tag
                  {selectedFlow?.category && ( // Display actual flow category
                    <span
                      style={{
                        background: '#DE1785',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '12px',
                      }}
                    >
                      {selectedFlow.category.charAt(0).toUpperCase() + selectedFlow.category.slice(1)}
                    </span>
                  )}
                </button>
                {showTagDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px',
                      minWidth: '180px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                    }}
                  >
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={e => setTagSearch(e.target.value)}
                      placeholder="Search tags..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                      {tagOptions // Use tagOptions for assignable tags
                        .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                        .map(t => (
                          <div
                            key={t}
                            onClick={() => handleTagSelect(t)}
                            style={{
                              padding: '6px 8px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '14px',
                              color: '#374151',
                              background: selectedFlow?.category?.toLowerCase() === t.toLowerCase() ? '#f3f4f6' : 'transparent', // Highlight based on flow's actual category
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={e =>
                              (e.currentTarget.style.background = selectedFlow?.category?.toLowerCase() === t.toLowerCase() ? '#f3f4f6' : 'transparent') // Highlight based on flow's actual category
                            }
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </div>
                        ))}
                        {/* Option to clear/remove tag */}
                        <div
                            onClick={() => handleTagSelect('')} // Pass empty string to clear tag
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '14px',
                                color: '#374151',
                                background: !selectedFlow?.category ? '#f3f4f6' : 'transparent',
                                transition: 'background 0.2s',
                                marginTop: '4px',
                                borderTop: '1px solid #eee'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={e =>
                                (e.currentTarget.style.background = !selectedFlow?.category ? '#f3f4f6' : 'transparent')
                            }
                        >
                            None
                        </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Assign button (no-op here) */}
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  borderRadius: '4px',
                }}
              >
                Assign
              </button>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  borderRadius: '4px',
                }}
                onClick={() => setIsTemplateModalOpen(!isTemplateModalOpen)} // Open template modal
              >
                Templates
              </button>
            </div>
          </div>

          {/* Thread list and chat area */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* ─── Sidebar: Your Flow/Thread List (now adjacent to Inbox button) ─── */}
            <div
              style={{
                width: '20%', // This remains the width of the thread list column
                borderRight: '1px solid #eee',
                backgroundColor: '#FBF7F7',
                overflowY: 'auto', // Allows scrolling for threads
                paddingLeft: 4,
                paddingRight: 4,
                                          }}
            >
              {/* Map of Message Boxes (Thread Previews) */}
              {filteredThreads.length === 0 && !loading && !error ? (
                <p style={{textAlign: 'center', color: '#888', padding: '10px'}}>No conversations found.</p>
              ) : (
                filteredThreads.map(id => {
                  const flow = myFlows.find(f => f.flowId === id);
                  const senderDisplayName = flow?.customerName || (id.includes('@') ? id.split('@')[0] : id); // Use customerName if available, else derive from ID
                  return (
                    <MessageBox
                      key={id}
                      message={{
                        id,
                        threadId: id,
                        channel: getChannel(id),
                        direction: 'incoming', // Default for sidebar preview
                        senderName: senderDisplayName,
                        preview: flow?.threadId || 'No messages yet...', // Use flow's preview
                        subject: flow?.lastMessageSubject || '',
                        body: '', // Not used for preview
                        timestamp: flow?.lastMessageTimestamp || '',
                        isClosed: flow?.status === 'resolved', // Reflect flow status
                        originalMessageId: flow?.originalMessageId || '', // Include original message ID if available
                      }}
                      isActive={id === selectedId}
                      onClick={() => onSelect(id)}
                    />
                  );
                })
              )}
            </div>
            
            {/* ─── Main Chat Pane ─── */}
            <div
              style={{
                flex: 1, // This will take up all remaining space
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#FBF7F7',
                width: 0,
                overflow: 'hidden'
              }}
            >
              {/* Chat messages display area */}
              <div style={{ flex: 1, padding: 16, overflowY: 'auto', overflowX: 'hidden' }}>
                {error && (
                  <div
                    style={{
                      background: '#fee',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 6,
                      width: 0  
                    }}
                  >
                    <p style={{ color: '#c00' }}>{error}</p>
                  </div>
                )}

                

                {loading ? (
                  <p style={{ textAlign: 'center', color: '#666' }}>Loading messages...</p>
                ) : !selectedId ? (
                  <p style={{ textAlign: 'center', color: '#666' }}>Select a conversation to view messages.</p>
                ) : chatMessages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#888' }}>No messages in this conversation yet.</p>
                ) : (
                  chatMessages.map(chat => {
                    const isActive = chat.id === activeMessageId
        
                    return (
                      <div
                        key={`${chat.id}-${chat.timestamp}`}
                        onClick={() => {
                          // Clicking on any message makes it "active" (expanded)
                          setActiveMessageId(chat.id ?? null)
                        }}
                        style={{
                          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                          width: '100%',
                          margin: '0 auto 16px auto',
                          padding: 12,
                          borderRadius: 5,
                          background: '#FFFBFA',
                          overflow: 'hidden',
                          cursor: 'pointer',
        
                          // If not active, limit its height so it looks "collapsed"
                          maxHeight: isActive ? 'none' : '60px',
                          transition: 'max-height 0.2s ease-out',
                        }}
                      >
                        <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>
                          <strong>{chat.senderName}</strong> ·{' '}
                          {new Date(chat.timestamp).toLocaleString()}
                        </p>
                        {chat.subject && (
                          <p style={{ fontStyle: 'italic', margin: '4px 0', fontSize: '0.95em' }}>
                            {chat.subject}
                          </p>
                        )}
                        <p
                          style={{
                            margin: '8px 0 0',
                            whiteSpace: 'pre-wrap',
                            // If the box is collapsed, hide overflow text
                            overflow: isActive ? 'visible' : 'hidden',
                          }}
                        >
                          {linkifyWithImages(chat.body)}
                        </p>
                        {selectedId && (
                  
                  <div style={{ textAlign: 'left', marginTop: 20 }}>
                  <button
                    onClick={() => {
                    const email = prompt('Enter email to add:')
                    if (email) addParticipant(selectedId, email)
                    }}
                    style={{
                    background: '#DE1785',
                    color: '#fff',
                    padding: '7px 18px',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '1.1em',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    marginRight: 20
                    }}
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    style={{
                    background: '#DE1785',
                    color: '#fff',
                    padding: '7px 18px',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '1.1em',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    }}
                  >
                    Reply to Customer
                  </button>
                  </div>
              )}
                      </div>
                    )
                  })
                )}

                {/* Reply Button */}
                
                {isComposing && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000,
        }}
        onClick={() => setIsComposing(false)} // clicking outside closes
      >
        <div
          style={{
            width: "400px",
            background: "#fff",
            borderRadius: 8,
            padding: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()} // prevent outside-click from closing when clicking inside
        >
          {/* ─── Header with "X" to close */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <strong>New Message</strong>
            <button
              onClick={() => setIsComposing(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                color: "#888",
              }}
            >
              ×
            </button>
          </div>

          {/* ─── Channel selector */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ marginRight: 8 }}>
              <input
                type="radio"
                checked={composeChannel === "email"}
                onChange={() => {
                  setComposeChannel("email");
                  setComposeBody("");
                  setComposeSubject("");
                }}
              />{" "}
              Email
            </label>
            <label>
              <input
                type="radio"
                checked={composeChannel === "whatsapp"}
                onChange={() => {
                  setComposeChannel("whatsapp");
                  setComposeBody("");
                }}
              />{" "}
              WhatsApp
            </label>
          </div>

          {/* ─── "To" input */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              placeholder={composeChannel === "email" ? "Email address" : "Phone number"}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                boxSizing: "border-box",
                fontSize: 14,
              }}
            />
          </div>

          {/* ─── If email: show "Subject" field */}
          {composeChannel === "email" && (
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject"
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                  fontSize: 14,
                }}
              />
            </div>
          )}

          {/* ─── Message body area */}
          <div style={{ marginBottom: 12 }}>
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={
                composeChannel === "email"
                  ? "Type your email…"
                  : "Type your WhatsApp message…"
              }
              style={{
                width: "100%",
                height: 100,
                padding: "8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                boxSizing: "border-box",
                resize: "vertical",
                fontSize: 14,
              }}
            />
          </div>

          {/* ─── "Send" button */}
          <button
            onClick={async () => {
              // 1) Basic validation
              if (!composeTo.trim() || !composeBody.trim()) {
                alert("Please fill in both 'To' and message body.");
                return;
              }

              try {
                if (composeChannel === "email") {
                  await sendEmailMessage(
                    composeTo.trim(),
                    composeSubject.trim(),
                    // For email, we'll send plainText = composeBody and no HTML here
                    composeBody.trim(),
                    // If you want HTML: you could convert Markdown or similar—but leaving plain text is OK.
                    composeBody
                  );
                } else {
                  // WhatsApp
                  await sendWhatsAppMessage(composeTo.trim(), composeBody.trim());
                }

                // Reset and close modal
                setIsComposing(false);
                setComposeTo("");
                setComposeBody("");
                setComposeSubject("");
                alert("Sent!");
              } catch (err: any) {
                console.error("Compose send error:", err);
                alert("Could not send: " + err.message);
              }
            }}
            style={{
              width: "100%",
              background: "#DE1785",
              color: "#fff",
              padding: "10px",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Send {composeChannel === "email" ? "Email" : "WhatsApp"}
          </button>
        </div>
      </div>
    )}
    {isTemplateModalOpen && (
            <TemplateModal
              isOpen={isTemplateModalOpen}
              onClose={() => setIsTemplateModalOpen(false)}
              onSubmit={() => console.log('hi')}
    />
            )}  
              </div>

              {/* Internal team discussion */}
    <div style={{padding: 16, overflowY: 'auto', backgroundColor: '#FBF7F7' }}>
      
      <div
        style={{
          height: 200,
                overflowY: 'auto',
          marginBottom: 28,
          padding: '8px',
        }}
      >
        {teamMessages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <p style={{ color: '#888', margin: 0, fontSize: '0.9em' }}>
              No team comments yet. Start a discussion!
            </p>
          </div>
        ) : (
          teamMessages.map(msg => (
            <div
              key={msg.commentId}
              style={{
                marginBottom: 6,
                borderBottom: '1px dashed #eee',
                paddingBottom: '4px',
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
                <strong>{msg.authorName}</strong> ·{' '}
                {new Date(msg.createdAt).toLocaleString()}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '0.95em',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </p>
            </div>
          ))
        )}
      </div>
      <div style={{ position: 'relative', width: '100%'}}>
        <textarea
          value={teamChatInput}
          onChange={e => setTeamChatInput(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTeamChatSend();
            }
          }}
          placeholder="Share thoughts with your team..."
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 40,
            backgroundColor: '#F3F4F6',
            padding: '8px 60px 8px 8px',
            borderRadius: 18,
            border: '1px solid #ccc',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
          }}
        />
        <button
          onClick={handleTeamChatSend}
          disabled={!teamChatInput.trim()}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            background: teamChatInput.trim() ? '#4CAF50' : '#ccc',
            color: '#fff',
            width: 40,
            height: 40,
            border: 'none',
            borderRadius: '50%',
            cursor: teamChatInput.trim() ? 'pointer' : 'not-allowed',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>

              {/* Reply overlay */}
              {isReplying && (
      <div>
              {getChannel(selectedId!!) === 'email' && (
            <>
              <input
                type="text"
                value={replySubject}
                onChange={e => setReplySubject(e.target.value)}
                placeholder="Subject"
                style={{
                  width: '100%',
                  marginBottom: 12,
                  padding: '8px 10px',
                  borderRadius: 4,
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                }}
              />
              <EmailReplyEditor
                ref={emailEditorRef}
                editorState={emailEditorState}
                onChange={setEmailEditorState}
                onSend={handleReplySend}
              />
            </>
          )}

        {getChannel(selectedId!!) === 'whatsapp' && (
          <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Type your reply…"
          style={{
            width: '100%',
            minHeight: 100,
            padding: 10,
            border: '1px solid #ccc',
            borderRadius: 4,
            marginBottom: 12,
            background: '#fff',
            fontSize: '1em',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          />
        )}

        <button
          onClick={handleReplySend}
          style={{
          background: '#DE1785',
          color: '#fff',
          padding: '10px 24px',
          border: 'none',
          borderRadius: 6,
          fontSize: '1.1em',
          cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
          marginTop: 8,
          fontWeight: 'bold',
          transition: 'background 0.2s',
          }}
        >
          Send Reply
        </button>
      </div>
    )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageList