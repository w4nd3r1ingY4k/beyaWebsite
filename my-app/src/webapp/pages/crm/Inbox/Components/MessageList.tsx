import React, { useState, useEffect, useMemo, useRef } from 'react'
import MessageBox from './MessageBox'
import { Message } from '../Types'
import { EditorState, convertToRaw, Editor } from 'draft-js'
import draftToHtml from 'draftjs-to-html'
import EmailReplyEditor from '../SendBox'
import { useAuth } from '../../../../../AuthContext'
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
  const [viewFilter, setViewFilter] = useState<ViewFilter>("owned")
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)

  const [emailEditorState, setEmailEditorState] = useState<EditorState>(
    () => EditorState.createEmpty()
  )
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false) // Controls template modal visibility
  const [isComposing, setIsComposing] = useState(false)
  const [composeChannel, setComposeChannel] = useState<Channel>("email")
  const [composeTo, setComposeTo] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeSubject, setComposeSubject] = useState("") // only used if composeChannel==="email"

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
  const tagOptions = ['sales', 'logistics', 'support']

  // ─────────── Derived Data (Memoized for Performance) ───────────
  const myFlows = useMemo(
    () => flows.filter(f => f.contactId === user?.userId),
    [flows, user?.userId]
  )

  const ownedFlows = useMemo(() => {
    return flows.filter(f => f.contactId === user?.userId)
  }, [flows, user?.userId])

  const sharedWithMe = useMemo(() => {
    return flows.filter(f =>
      Array.isArray(f.participants)
      && f.participants.includes(user!.userId)
      && f.contactId !== user!.userId
    )
  }, [flows, user?.userId])

  const sharedByMe = useMemo(() => {
    return ownedFlows.filter(f =>
      Array.isArray(f.participants) && f.participants.length > 0
    )
  }, [ownedFlows])

  const categoryFilterOptions = useMemo(() => {
    const options = new Set<string>()
    options.add('all')
    myFlows.forEach(f => {
      if (f.category) {
        options.add(f.category.toLowerCase())
      }
    })
    return Array.from(options).sort()
  }, [myFlows])

  const selectedFlow = useMemo(() => {
    let setToUse: any[] = []
    if (viewFilter === "owned") {
      setToUse = ownedFlows
    } else if (viewFilter === "sharedWithMe") {
      setToUse = sharedWithMe
    } else {
      setToUse = sharedByMe
    }
    return setToUse.find(f => f.flowId === selectedId)
  }, [ownedFlows, sharedWithMe, sharedByMe, selectedId, viewFilter])

  const filteredThreads = useMemo(() => {
    let baseFlows: any[] = []
    if (viewFilter === "owned") {
      baseFlows = ownedFlows
    } else if (viewFilter === "sharedWithMe") {
      baseFlows = sharedWithMe
    } else {
      baseFlows = sharedByMe
    }

    const baseFlowIds = new Set(baseFlows.map(f => f.flowId))
    let result = threads.filter(id => baseFlowIds.has(id))

    if (categoryFilter !== "all") {
      const matching = new Set(
        baseFlows
          .filter(
            f =>
              typeof f.category === "string" &&
              f.category.toLowerCase() === categoryFilter.toLowerCase()
          )
          .map(f => f.flowId)
      )
      result = result.filter(id => matching.has(id))
    }

    if (statusFilter !== "all") {
      const matching = new Set(
        baseFlows.filter(f => f.status === statusFilter).map(f => f.flowId)
      )
      result = result.filter(id => matching.has(id))
    }

    return result
  }, [
    threads,
    ownedFlows,
    sharedWithMe,
    sharedByMe,
    categoryFilter,
    statusFilter,
    viewFilter,
  ])

  // ─────────── Effects ───────────
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
    return new Set(myFlows.map(f => f.flowId))
  }, [myFlows])

  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMsg = chatMessages[chatMessages.length - 1]
      setActiveMessageId(lastMsg.id!)
    } else {
      setActiveMessageId(null)
    }
  }, [chatMessages])

  useEffect(() => {
    if (!user) return

    fetch(`${API_BASE}/flows`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setFlows(data.flows || [])
      })
      .catch(err => console.error('Error loading flows:', err))

    fetch(`${API_BASE}/webhook/threads`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        const ts: string[] = data.threads || []
        setThreads(ts)
        if (ts.length && !selectedId) {
          const firstOwnedThread = ts.find(id =>
            ownedFlows.some(f => f.flowId === id)
          )
          if (firstOwnedThread) onSelect(firstOwnedThread)
          else if (ts.length > 0) onSelect(ts[0])
        }
      })
      .catch(err => {
        console.error('Failed to fetch threads:', err)
        setError('Failed to load conversations')
      })
  }, [user, onSelect, selectedId, ownedFlowIds])

  useEffect(() => {
    if (!selectedId) {
      setTeamMessages([])
      return
    }

    setLoading(true)
    setError(null)

    fetch(`https://pndg7ad6xttoa2qm645ryd6bii0cugff.lambda-url.us-east-1.on.aws/flows/${encodeURIComponent(selectedId)}/comments`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { comments: TeamMessage[] }) => {
        setTeamMessages(data.comments)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load internal comments:", err)
        setError("Could not load internal comments")
        setTeamMessages([])
        setLoading(false)
      })
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) {
      setChatMessages([])
      setTeamMessages([])
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
              : m.ThreadId || m.from || m.sender || 'Unknown'
          const getField = (f: string) =>
            m[f] ?? m[f.charAt(0).toUpperCase() + f.slice(1)] ?? ''

          return {
            id: getField('MessageId') || Date.now().toString() + Math.random().toString(36).substring(2, 9),
            threadId: m.ThreadId || selectedId,
            channel: getChannel(selectedId),
            direction: dir,
            senderName: sender,
            preview: getField('body')?.slice(0, 120) || '',
            subject: m.subject || '',
            body: getField('body') || '',
            timestamp: new Date(+m.Timestamp || Date.now()).toISOString(),
            isClosed: false,
            senderAvatar: undefined,
            originalMessageId: getField('MessageId')
          }
        })

        setChatMessages(msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch messages:', err)
        setError(`Failed to load messages: ${err.message}`)
        setChatMessages([])
        setLoading(false)
      })

    const saved = localStorage.getItem(`team-chat-${selectedId}`)
    setTeamMessages(saved ? JSON.parse(saved) : [])
  }, [selectedId, currentUser])

  function getChannel(id: string): Channel {
    return id.includes('@') ? 'email' : 'whatsapp'
  }

  async function updateFlow(flowId: string, updates: Record<string, any>) {
    const payload = {
      ...updates,
      userId: user!.userId
    }

    const FUNCTION_URL =
      'https://spizyylamz3oavcuay5a3hrmsi0eairh.lambda-url.us-east-1.on.aws'

    const res = await fetch(
      `${FUNCTION_URL}/flows/${encodeURIComponent(flowId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  async function addParticipant(flowId: string, newEmail: string) {
    const flowObj = flows.find(f => f.flowId === flowId)
    if (!flowObj) {
      throw new Error("Flow not found")
    }

    let lookupResponse: Response
    try {
      lookupResponse = await fetch(`${API_BASE}/users/email?email=${encodeURIComponent(newEmail)}`)
    } catch (networkErr) {
      console.error("Network error while looking up email:", networkErr)
      throw new Error("Could not reach user‐lookup service")
    }

    if (lookupResponse.status === 404) {
      throw new Error(`No user found with email "${newEmail}"`)
    }

    if (!lookupResponse.ok) {
      const errBody = await lookupResponse.text().catch(() => null)
      console.error("Error from user‐lookup endpoint:", lookupResponse.status, errBody)
      throw new Error("Error looking up user by email")
    }

    const userRecord = (await lookupResponse.json()) as { userId: string; [key: string]: any }
    const newUserId = userRecord.userId
    if (!newUserId) {
      console.error("Lookup returned no userId:", userRecord)
      throw new Error("Invalid lookup result: missing userId")
    }

    const existing: string[] = Array.isArray(flowObj.participants)
      ? flowObj.participants
      : []

    const deduped = new Set(existing)
    deduped.add(newUserId)

    const updatedParticipants = Array.from(deduped)

    let updatedFlowData: any
    try {
      const { updated } = await updateFlow(flowId, {
        participants: updatedParticipants,
      })
      updatedFlowData = updated
    } catch (updateErr: any) {
      console.error("Error updating flow participants:", updateErr)
      throw new Error("Could not update flow participants")
    }

    setFlows(allFlows =>
      allFlows.map(f => (f.flowId === updatedFlowData.flowId ? updatedFlowData : f))
    )
  }

  const handleTagSelect = async (tag: string) => {
    setShowTagDropdown(false)
    setTagSearch('')

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
      const { updated } = await updateFlow(flowToUpdate.flowId, { category: tag })
      setFlows(fs =>
        fs.map(f => (f.flowId === updated.flowId ? updated : f))
      )
    } catch (err: any) {
      console.error('Failed to update category:', err)
      alert('Could not update category: ' + err.message)
    }
  }

  function linkifyWithImages(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.split(urlRegex).map((part, index) => {
      const match = part.match(urlRegex)
      if (!match) return part

      let url = match[0]
      let trailing = ''

      while (
        url.length > 0 &&
        [')', ']', '}', ',', '.', '!', '?'].includes(url[url.length - 1])
      ) {
        trailing = url[url.length - 1] + trailing
        url = url.slice(0, -1)
      }

      if (/\.(jpe?g|png|gif|webp|svg)(?:\?.*)?$/i.test(url)) {
        return (
          <React.Fragment key={index}>
            <img
              src={url}
              alt=""
              className="max-w-full block my-2"
            />
            {trailing}
          </React.Fragment>
        )
      }

      return (
        <React.Fragment key={index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 break-words"
          >
            {url}
          </a>
          {trailing}
        </React.Fragment>
      )
    })
  }

  const handleStatusSelect = async (status: Status) => {
    setShowStatusDropdown(false)

    if (!selectedId) return
    const flowObj = myFlows.find(f => f.flowId === selectedId)
    if (!flowObj) return

    try {
      const { updated } = await updateFlow(flowObj.flowId, { status })
      setFlows(fs =>
        fs.map(f => (f.flowId === updated.flowId ? updated : f))
      )
    } catch (err: any) {
      console.error('Failed to update status:', err)
      alert(`Could not update status: ${err.message}`)
    }
  }

  async function sendWhatsAppMessage(to: string, body: string) {
    const res = await fetch(`${API_BASE}/send/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: body, userId: user!.userId }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  async function sendEmailMessage(
    to: string,
    subject: string,
    plainText: string,
    htmlContent: string,
    originalMessageId?: string
  ) {
    const payload: any = {
      to,
      subject,
      text: plainText,
      html: htmlContent,
      userId: user!.userId
    }

    if (originalMessageId) {
      payload.originalMessageId = originalMessageId
    }

    const res = await fetch(`${API_BASE}/send/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }
    return res.json()
  }

  const handleReplySend = async () => {
    const channel = getChannel(selectedId!!)
    try {
      if (channel === 'whatsapp') {
        if (!replyText.trim()) return
        await sendWhatsAppMessage(selectedId!!, replyText)
      } else {
        const contentState = emailEditorState.getCurrentContent()
        const plainText = contentState.getPlainText()
        const raw = convertToRaw(contentState)
        const htmlBody = draftToHtml(raw)

        const incoming = chatMessages.find(msg => msg.direction === 'incoming')
        const originalMessageId = incoming?.originalMessageId

        await sendEmailMessage(
          decodeURIComponent(selectedId!!),
          replySubject,
          plainText,
          htmlBody,
          originalMessageId
        )
      }

      if (channel === 'email') {
        setEmailEditorState(EditorState.createEmpty())
        setReplySubject('')
      } else {
        setReplyText('')
      }
      setIsReplying(false)
    } catch (err: any) {
      console.error('Failed to send reply:', err)
      alert('Failed to send reply: ' + err.message)
    }
  }

  const handleTeamChatSend = async () => {
    if (!selectedId || !teamChatInput.trim()) return

    const safeId = encodeURIComponent(selectedId)

    let postRes: Response
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
      )
    } catch (networkErr) {
      console.error("Network error posting comment:", networkErr)
      alert("Could not reach comments service")
      return
    }

    if (!postRes.ok) {
      const errText = await postRes.text().catch(() => "")
      console.error("Error from POST comments:", postRes.status, errText)
      alert("Could not post comment")
      return
    }

    const newComment = await postRes.json() as TeamMessage
    setTeamMessages(prev => [...prev, newComment])
    setTeamChatInput("")
  }

  return (
    <div className="h-screen w-full bg-[#FFFBFA] font-sans overflow-hidden">
      <div className="flex h-full overflow-hidden">
        {/* ─── Sidebar Container ─── */}
        <div className="w-[23vh] bg-[#FFFBFA] flex flex-col items-center mt-[3.5vh] p-[10px]">
          <button
            onClick={() => {
              setComposeChannel("email")
              setComposeTo("")
              setComposeBody("")
              setComposeSubject("")
              setIsComposing(true)
            }}
            className="w-[calc(100%-8px)] my-[4px] py-[10px] bg-[#de1785] border border-transparent rounded-[6px] cursor-pointer text-[14px] font-bold text-white text-center"
          >
            Compose
          </button>

          <button
            onClick={() => {
              setViewFilter("owned")
              setCategoryFilter("all")
              setStatusFilter("all")
            }}
            className={`w-[calc(100%-8px)] my-[4px] py-[10px] border border-transparent rounded-[6px] cursor-pointer text-[14px] font-bold text-[#374151] text-left transition ${
              viewFilter === "owned" ? "bg-[#EAE5E5]" : "bg-transparent"
            }`}
            onMouseEnter={e => {
              if (viewFilter !== "owned") e.currentTarget.classList.add("bg-[#f3e0f0]")
            }}
            onMouseLeave={e => {
              if (viewFilter !== "owned") e.currentTarget.classList.remove("bg-[#f3e0f0]")
            }}
          >
            Inbox
          </button>

          <button
            onClick={() => {
              setViewFilter("sharedWithMe")
              setCategoryFilter("all")
              setStatusFilter("all")
            }}
            className={`w-[calc(100%-8px)] my-[4px] py-[10px] border border-transparent rounded-[6px] cursor-pointer text-[14px] font-bold text-[#374151] text-left transition ${
              viewFilter === "sharedWithMe" ? "bg-[#EAE5E5]" : "bg-transparent"
            }`}
            onMouseEnter={e => {
              if (viewFilter !== "sharedWithMe") e.currentTarget.classList.add("bg-[#f3e0f0]")
            }}
            onMouseLeave={e => {
              if (viewFilter !== "sharedWithMe") e.currentTarget.classList.remove("bg-[#f3e0f0]")
            }}
          >
            Shared With Me
          </button>

          <button
            onClick={() => {
              setViewFilter("sharedByMe")
              setCategoryFilter("all")
              setStatusFilter("all")
            }}
            className={`w-[calc(100%-8px)] my-[4px] py-[10px] border border-transparent rounded-[6px] cursor-pointer text-[14px] font-bold text-[#374151] text-left transition ${
              viewFilter === "sharedByMe" ? "bg-[#EAE5E5]" : "bg-transparent"
            }`}
            onMouseEnter={e => {
              if (viewFilter !== "sharedByMe") e.currentTarget.classList.add("bg-[#f3e0f0]")
            }}
            onMouseLeave={e => {
              if (viewFilter !== "sharedByMe") e.currentTarget.classList.remove("bg-[#f3e0f0]")
            }}
          >
            Shared
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ─── Header Controls ─── */}
          <div className="pt-[10px] pb-[5px] flex justify-between items-center mt-[30px] mb-[5px] px-[2px]">
            <div className="flex text-[15px] gap-[12px] items-center mt-[10px] ml-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`bg-${
                  statusFilter === 'all' ? '#f3f4f6' : 'transparent'
                } border-none py-[6px] px-[12px] cursor-pointer text-[17px] text-[#374151]`}
              >
                All
              </button>
              {(['open', 'waiting', 'resolved', 'overdue'] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="bg-transparent border-none py-[6px] px-[12px] cursor-pointer text-[17px] text-[#374151] rounded-[4px] relative outline-none"
                >
                  <span className="relative z-10">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  {statusFilter === s && (
                    <span
                      className={`absolute left-[6px] right-[6px] bottom-[-4px] h-[6px] rounded-t-[6px] ${
                        s === 'open'
                          ? 'bg-[#10b981]'
                          : s === 'waiting'
                          ? 'bg-[#f59e0b]'
                          : s === 'resolved'
                          ? 'bg-[#6b7280]'
                          : 'bg-[#ef4444]'
                      } z-0`}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-[8px] items-center">
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="bg-transparent border border-[#d1d5db] py-[8px] px-[12px] cursor-pointer rounded-[4px] flex items-center gap-[4px] text-[14px] text-[#374151]"
                >
                  {selectedFlow?.status
                    ? selectedFlow.status.charAt(0).toUpperCase() + selectedFlow.status.slice(1)
                    : 'Select Status'}
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
                  <div className="absolute right-0 bg-white border border-[#d1d5db] rounded-[6px] shadow-[0_4px_8px_rgba(0,0,0,0.08)] min-w-[140px] z-1000 overflow-hidden">
                    {(['open', 'waiting', 'resolved', 'overdue'] as Status[]).map(s => (
                      <div
                        key={s}
                        onClick={() => handleStatusSelect(s)}
                        className={`px-[12px] py-[8px] cursor-pointer text-[14px] text-[#374151] flex items-center gap-[8px] ${
                          selectedFlow?.status === s ? 'bg-[#f3f4f6]' : 'bg-transparent'
                        }`}
                        onMouseEnter={e => e.currentTarget.classList.add('bg-[#f3f4f6]')}
                        onMouseLeave={e =>
                          e.currentTarget.classList.toggle(
                            'bg-[#f3f4f6]',
                            selectedFlow?.status === s
                          )
                        }
                      >
                        <div
                          className={`w-[8px] h-[8px] rounded-full ${
                            s === 'open'
                              ? 'bg-[#10b981]'
                              : s === 'waiting'
                              ? 'bg-[#f59e0b]'
                              : s === 'resolved'
                              ? 'bg-[#6b7280]'
                              : 'bg-[#ef4444]'
                          }`}
                        />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="bg-transparent border border-[#d1d5db] p-[8px] cursor-pointer rounded-[4px] flex items-center justify-center">
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

              <button className="bg-transparent border border-[#d1d5db] p-[8px] cursor-pointer rounded-[4px] flex items-center justify-center">
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

          {/* ─── Category Filter & Info Header ─── */}
          <div className="flex justify-start items-center w-full bg-[#FBF7F7] px-[16px] py-[12px]">
            <div className="flex gap-[12px] items-center">
              <span className="text-[14px] text-[#374151] font-bold">Filter:</span>
              {categoryFilterOptions.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`py-[6px] px-[12px] cursor-pointer text-[14px] text-[#374151] rounded-[4px] ${
                    categoryFilter === cat ? 'bg-[#f3f4f6]' : 'bg-transparent'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
              <button className="py-[6px] px-[12px] cursor-pointer text-[14px] text-[#374151] rounded-[4px]">
                Newest
              </button>
            </div>

            <div className="flex gap-[8px] ml-auto items-center">
              <div className="relative" ref={tagDropdownRef}>
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="bg-transparent border border-[#d1d5db] py-[6px] px-[12px] cursor-pointer text-[14px] text-[#374151] rounded-[4px] flex items-center gap-[4px]"
                >
                  Tag
                  {selectedFlow?.category && (
                    <span className="bg-[#DE1785] text-white py-[2px] px-[6px] rounded-[3px] text-[12px]">
                      {selectedFlow.category.charAt(0).toUpperCase() + selectedFlow.category.slice(1)}
                    </span>
                  )}
                </button>
                {showTagDropdown && (
                  <div className="absolute top-full right-0 mt-[4px] bg-white border border-[#d1d5db] rounded-[6px] shadow-[0_4px_6px_rgba(0,0,0,0.1)] min-w-[180px] z-1000 p-[8px] overflow-hidden">
                    <input
                      type="text"
                      value={tagSearch}
                      onChange={e => setTagSearch(e.target.value)}
                      placeholder="Search tags..."
                      className="w-full py-[6px] px-[8px] border border-[#d1d5db] rounded-[4px] text-[14px] mb-[8px]"
                    />
                    <div className="max-h-[200px] overflow-y-auto">
                      {tagOptions
                        .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                        .map(t => (
                          <div
                            key={t}
                            onClick={() => handleTagSelect(t)}
                            className={`py-[6px] px-[8px] cursor-pointer text-[14px] text-[#374151] rounded-[4px] ${
                              selectedFlow?.category?.toLowerCase() === t.toLowerCase()
                                ? 'bg-[#f3f4f6]'
                                : 'bg-transparent'
                            } transition`}
                            onMouseEnter={e => e.currentTarget.classList.add('bg-[#f3f4f6]')}
                            onMouseLeave={e =>
                              e.currentTarget.classList.toggle(
                                'bg-[#f3f4f6]',
                                selectedFlow?.category?.toLowerCase() === t.toLowerCase()
                              )
                            }
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </div>
                        ))}
                      <div
                        onClick={() => handleTagSelect('')}
                        className={`mt-[4px] pt-[4px] border-t border-[#eee] py-[6px] px-[8px] cursor-pointer text-[14px] text-[#374151] rounded-[4px] ${
                          !selectedFlow?.category ? 'bg-[#f3f4f6]' : 'bg-transparent'
                        } transition`}
                        onMouseEnter={e => e.currentTarget.classList.add('bg-[#f3f4f6]')}
                        onMouseLeave={e =>
                          e.currentTarget.classList.toggle('bg-[#f3f4f6]', !selectedFlow?.category)
                        }
                      >
                        None
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button className="bg-transparent border border-[#d1d5db] py-[6px] px-[12px] cursor-pointer text-[14px] text-[#374151] rounded-[4px]">
                Assign
              </button>
              <button
                className="bg-transparent border border-[#d1d5db] py-[6px] px-[12px] cursor-pointer text-[14px] text-[#374151] rounded-[4px]"
                onClick={() => setIsTemplateModalOpen(!isTemplateModalOpen)}
              >
                Templates
              </button>
            </div>
          </div>

          {/* ─── Thread List & Chat ─── */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[20%] border-r border-[#eee] bg-[#FBF7F7] overflow-y-auto px-[4px]">
              {filteredThreads.length === 0 && !loading && !error ? (
                <p className="text-center text-[#888] py-[10px]">No conversations found.</p>
              ) : (
                filteredThreads.map(id => {
                  const flow = myFlows.find(f => f.flowId === id)
                  const senderDisplayName = flow?.customerName || (id.includes('@') ? id.split('@')[0] : id)
                  return (
                    <MessageBox
                      key={id}
                      message={{
                        id,
                        threadId: id,
                        channel: getChannel(id),
                        direction: 'incoming',
                        senderName: senderDisplayName,
                        preview: flow?.threadId || 'No messages yet...',
                        subject: flow?.lastMessageSubject || '',
                        body: '',
                        timestamp: flow?.lastMessageTimestamp || '',
                        isClosed: flow?.status === 'resolved',
                        originalMessageId: flow?.originalMessageId || '',
                      }}
                      isActive={id === selectedId}
                      onClick={() => onSelect(id)}
                    />
                  )
                })
              )}
            </div>

            <div className="flex-1 relative flex flex-col bg-[#FBF7F7] w-0 overflow-hidden">
              <div className="flex-1 p-[16px] overflow-y-auto overflow-x-hidden">
                {error && (
                  <div className="bg-[#fee] p-[12px] rounded-[8px] mb-[6px] w-0">
                    <p className="text-[#c00]">{error}</p>
                  </div>
                )}

                {loading ? (
                  <p className="text-center text-[#666]">Loading messages...</p>
                ) : !selectedId ? (
                  <p className="text-center text-[#666]">Select a conversation to view messages.</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-center text-[#888]">No messages in this conversation yet.</p>
                ) : (
                  chatMessages.map(chat => {
                    const isActive = chat.id === activeMessageId
                    return (
                      <div
                        key={`${chat.id}-${chat.timestamp}`}
                        onClick={() => setActiveMessageId(chat.id ?? null)}
                        className={`shadow-[0_2px_8px_rgba(0,0,0,0.07)] w-full mx-auto mb-[16px] p-[12px] rounded-[5px] bg-[#FFFBFA] overflow-hidden cursor-pointer ${
                          isActive ? 'max-h-full' : 'max-h-[60px] transition-max-height duration-200 ease-out'
                        }`}
                      >
                        <p className="m-0 text-[#555] text-[0.9em]">
                          <strong>{chat.senderName}</strong> ·{' '}
                          {new Date(chat.timestamp).toLocaleString()}
                        </p>
                        {chat.subject && (
                          <p className="italic m-[4px_0_0] text-[0.95em]">
                            {chat.subject}
                          </p>
                        )}
                        <p
                          className={`mt-[8px] whitespace-pre-wrap ${isActive ? 'overflow-visible' : 'overflow-hidden'}`}
                        >
                          {linkifyWithImages(chat.body)}
                        </p>
                        {selectedId && (
                          <div className="text-left mt-[20px]">
                            <button
                              onClick={() => {
                                const email = prompt('Enter email to add:')
                                if (email) addParticipant(selectedId, email)
                              }}
                              className="bg-[#DE1785] text-white py-[7px] px-[18px] border-none rounded-[6px] text-[1.1em] cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.2)] mr-[20px]"
                            >
                              Share
                            </button>
                            <button
                              onClick={() => setIsReplying(!isReplying)}
                              className="bg-[#DE1785] text-white py-[7px] px-[18px] border-none rounded-[6px] text-[1.1em] cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.2)]"
                            >
                              Reply to Customer
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {isComposing && (
                  <div
                    className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-[2000]"
                    onClick={() => setIsComposing(false)}
                  >
                    <div
                      className="w-[400px] bg-white rounded-[8px] p-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] relative"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between mb-[12px]">
                        <strong>New Message</strong>
                        <button
                          onClick={() => setIsComposing(false)}
                          className="bg-none border-none text-[18px] cursor-pointer text-[#888]"
                        >
                          ×
                        </button>
                      </div>

                      <div className="mb-[12px]">
                        <label className="mr-[8px]">
                          <input
                            type="radio"
                            checked={composeChannel === "email"}
                            onChange={() => {
                              setComposeChannel("email")
                              setComposeBody("")
                              setComposeSubject("")
                            }}
                          />{" "}
                          Email
                        </label>
                        <label>
                          <input
                            type="radio"
                            checked={composeChannel === "whatsapp"}
                            onChange={() => {
                              setComposeChannel("whatsapp")
                              setComposeBody("")
                            }}
                          />{" "}
                          WhatsApp
                        </label>
                      </div>

                      <div className="mb-[12px]">
                        <input
                          type="text"
                          value={composeTo}
                          onChange={e => setComposeTo(e.target.value)}
                          placeholder={composeChannel === "email" ? "Email address" : "Phone number"}
                          className="w-full py-[8px] px-[8px] border border-[#ccc] rounded-[4px] box-border text-[14px]"
                        />
                      </div>

                      {composeChannel === "email" && (
                        <div className="mb-[12px]">
                          <input
                            type="text"
                            value={composeSubject}
                            onChange={e => setComposeSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full py-[8px] px-[8px] border border-[#ccc] rounded-[4px] box-border text-[14px]"
                          />
                        </div>
                      )}

                      <div className="mb-[12px]">
                        <textarea
                          value={composeBody}
                          onChange={e => setComposeBody(e.target.value)}
                          placeholder={
                            composeChannel === "email"
                              ? "Type your email…"
                              : "Type your WhatsApp message…"
                          }
                          className="w-full h-[100px] py-[8px] px-[8px] border border-[#ccc] rounded-[4px] box-border text-[14px] resize-vertical"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          if (!composeTo.trim() || !composeBody.trim()) {
                            alert("Please fill in both 'To' and message body.")
                            return
                          }

                          try {
                            if (composeChannel === "email") {
                              await sendEmailMessage(
                                composeTo.trim(),
                                composeSubject.trim(),
                                composeBody.trim(),
                                composeBody
                              )
                            } else {
                              await sendWhatsAppMessage(composeTo.trim(), composeBody.trim())
                            }

                            setIsComposing(false)
                            setComposeTo("")
                            setComposeBody("")
                            setComposeSubject("")
                            alert("Sent!")
                          } catch (err: any) {
                            console.error("Compose send error:", err)
                            alert("Could not send: " + err.message)
                          }
                        }}
                        className="w-full bg-[#DE1785] text-white py-[10px] border-none rounded-[4px] cursor-pointer text-[16px] font-bold"
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

              <div className="p-[16px] overflow-y-auto bg-[#FBF7F7]">
                <div className="h-[200px] overflow-y-auto mb-[28px] p-[8px]">
                  {teamMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[#888] m-0 text-[0.9em]">
                        No team comments yet. Start a discussion!
                      </p>
                    </div>
                  ) : (
                    teamMessages.map(msg => (
                      <div
                        key={msg.commentId}
                        className="mb-[6px] border-b border-dashed border-[#eee] pb-[4px]"
                      >
                        <p className="m-0 text-[12px] text-[#555]">
                          <strong>{msg.authorName}</strong> ·{' '}
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-[4px] text-[0.95em] whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="relative w-full">
                  <textarea
                    value={teamChatInput}
                    onChange={e => setTeamChatInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleTeamChatSend()
                      }
                    }}
                    placeholder="Share thoughts with your team..."
                    className="absolute bottom-0 left-0 w-full h-[40px] bg-[#F3F4F6] py-[8px] px-[8px] rounded-[18px] border border-[#ccc] box-border font-sans"
                  />
                  <button
                    onClick={handleTeamChatSend}
                    disabled={!teamChatInput.trim()}
                    className={`absolute right-[8px] bottom-[8px] w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${
                      teamChatInput.trim() ? 'bg-[#4CAF50] cursor-pointer' : 'bg-[#ccc] cursor-not-allowed'
                    } text-white`}
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

              {isReplying && (
                <div>
                  {getChannel(selectedId!!) === 'email' && (
                    <>
                      <input
                        type="text"
                        value={replySubject}
                        onChange={e => setReplySubject(e.target.value)}
                        placeholder="Subject"
                        className="w-full mb-[12px] py-[8px] px-[10px] border border-[#ccc] rounded-[4px] box-border"
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
                      className="w-full min-h-[100px] py-[10px] px-[10px] border border-[#ccc] rounded-[4px] mb-[12px] bg-white text-[1em] resize-vertical box-border"
                    />
                  )}

                  <button
                    onClick={handleReplySend}
                    className="bg-[#DE1785] text-white py-[10px] px-[24px] border-none rounded-[6px] text-[1.1em] cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.15)] mt-[8px] font-bold transition-colors duration-200"
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
