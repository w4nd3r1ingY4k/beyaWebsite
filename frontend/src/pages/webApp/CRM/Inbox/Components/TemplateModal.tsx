// TemplateModal.tsx
import React, { useState } from "react";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  bodyText: string;
  subject?: string;
  type: "whatsapp" | "email";
  status: "approved" | "pending" | "rejected";
  createdAt: Date;
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    language: string;
    category: string;
    bodyText: string;
    subject?: string;
    type: "whatsapp" | "email";
  }) => void;
  onSendToMeta?: (templateId: string) => void;
  existingTemplates?: Template[];
}

// ─── Adjust to match your actual backend base URL ───
const API_BASE = "https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod";

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSendToMeta,
  existingTemplates = [],
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "view">("create");
  const [templateType, setTemplateType] = useState<"whatsapp" | "email">(
    "whatsapp"
  );
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState("TRANSACTIONAL");
  const [bodyText, setBodyText] = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending" | "rejected"
  >("all");
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ─── Build inline style objects ────────────────────

  const styles = {
    backdrop: {
      position: "fixed" as const,
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
    },
    modalContainer: {
      position: "fixed" as const,
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#ffffff",
      borderRadius: "24px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      width: "90%",
      maxWidth: "720px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column" as const,
      opacity: 1,
      transition: "opacity 0.2s ease-in-out",
      overflow: "hidden",
      zIndex: 1001,
    },
    header: {
      padding: "32px 32px 24px",
      borderBottom: "1px solid #e5e7eb",
    },
    title: {
      margin: 0,
      fontSize: "1.5rem",
      fontWeight: 600,
      color: "#111827",
    },
    subtitle: {
      marginTop: "4px",
      fontSize: "0.875rem",
      color: "#6b7280",
    },
    tabsContainer: {
      display: "flex",
      gap: "8px",
      marginTop: "24px",
      padding: "4px",
      backgroundColor: "#f3f4f6",
      borderRadius: "12px",
    },
    tabButton: (active: boolean) => ({
      flex: 1,
      padding: "8px 24px",
      fontSize: "0.875rem",
      fontWeight: 500,
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      backgroundColor: active ? "#ffffff" : "transparent",
      color: active ? "#111827" : "#4b5563",
      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
      transition: "all 0.2s ease-in-out",
    }),
    contentArea: {
      padding: "24px 32px",
      overflowY: "auto" as const,
      flex: 1,
    },
    fieldGroup: {
      marginBottom: "24px",
    },
    label: {
      display: "block",
      marginBottom: "4px",
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "#374151",
    },
    input: (hasError: boolean) => ({
      width: "100%",
      padding: "12px 16px",
      fontSize: "1rem",
      borderRadius: "12px",
      border: hasError ? "1px solid #fca5a5" : "1px solid #d1d5db",
      backgroundColor: hasError ? "#fef2f2" : "#f9fafb",
      color: "#111827",
      outline: "none",
      transition: "border 0.2s ease-in-out",
    }),
    textarea: (hasError: boolean) => ({
      width: "100%",
      height: "140px",
      padding: "12px 16px",
      fontSize: "1rem",
      borderRadius: "12px",
      border: hasError ? "1px solid #fca5a5" : "1px solid #d1d5db",
      backgroundColor: hasError ? "#fef2f2" : "#f9fafb",
      color: "#111827",
      outline: "none",
      resize: "vertical" as const,
      transition: "border 0.2s ease-in-out",
    }),
    smallNote: {
      marginTop: "4px",
      fontSize: "0.75rem",
      color: "#6b7280",
    },
    errorMsg: {
      marginTop: "4px",
      fontSize: "0.75rem",
      color: "#b91c1c",
    },
    selectWrapper: {
      position: "relative" as const,
    },
    select: {
      width: "100%",
      appearance: "none" as const,
      WebkitAppearance: "none" as const,
      MozAppearance: "none" as const,
      padding: "12px 40px 12px 16px",
      fontSize: "1rem",
      borderRadius: "12px",
      border: "1px solid #d1d5db",
      backgroundColor: "#f9fafb",
      color: "#111827",
      outline: "none",
      transition: "border 0.2s ease-in-out",
      cursor: "pointer",
    },
    selectIcon: {
      position: "absolute" as const,
      top: "50%",
      right: "16px",
      transform: "translateY(-50%)",
      pointerEvents: "none" as const,
      color: "#9ca3af",
      fontSize: "0.875rem",
    },
    footer: {
      padding: "24px 32px",
      borderTop: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      display: "flex",
      justifyContent: "flex-end" as const,
      gap: "12px",
    },
    buttonSecondary: {
      padding: "10px 24px",
      fontSize: "0.875rem",
      fontWeight: 500,
      borderRadius: "9999px",
      border: "1px solid #d1d5db",
      backgroundColor: "#ffffff",
      color: "#374151",
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
    },
    buttonPrimary: {
      padding: "10px 24px",
      fontSize: "0.875rem",
      fontWeight: 500,
      borderRadius: "9999px",
      border: "none",
      backgroundColor: "#de1785",
      color: "#ffffff",
      cursor: "pointer",
      boxShadow: "0 4px 8px rgba(222,23,133,0.25)",
      transition: "all 0.2s ease-in-out",
    },
    statusBadge: (status: Template["status"]) => {
      const backgroundColor =
        status === "approved"
          ? "#d1fae5"
          : status === "pending"
          ? "#fef3c7"
          : "#fee2e2";
      const textColor =
        status === "approved"
          ? "#047857"
          : status === "pending"
          ? "#b45309"
          : "#991b1b";
      return {
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "0.75rem",
        fontWeight: 500,
        borderRadius: "9999px",
        backgroundColor,
        color: textColor,
      };
    },
    templateCard: {
      padding: "16px",
      backgroundColor: "#f9fafb",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      transition: "all 0.2s ease-in-out",
      display: "flex",
      justifyContent: "space-between" as const,
      cursor: "pointer",
    },
    templateCardHover: {
      borderColor: "#d1d5db",
    },
    templateInfo: {
      flex: 1,
    },
    templateNameRow: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "4px",
    },
    templateTitle: {
      margin: 0,
      fontSize: "1rem",
      fontWeight: 500,
      color: "#111827",
    },
    templateMetaRow: {
      display: "flex",
      gap: "16px",
      fontSize: "0.75rem",
      color: "#6b7280",
      marginTop: "4px",
    },
    noTemplatesPlaceholder: {
      textAlign: "center" as const,
      padding: "48px 0",
      color: "#9ca3af",
      fontSize: "0.875rem",
    },
    icon: {
      width: "1em",
      height: "1em",
      fill: "currentColor",
    },
    whatsappIcon: {
      width: "16px",
      height: "16px",
    },
    emailIcon: {
      width: "16px",
      height: "16px",
    },
    filterRow: {
      display: "flex",
      gap: "8px",
      marginBottom: "16px",
    },
    filterButton: (active: boolean, color: string) => ({
      padding: "8px 16px",
      fontSize: "0.75rem",
      fontWeight: 500,
      borderRadius: "9999px",
      border: "none",
      cursor: "pointer",
      backgroundColor: active ? color : "#f3f4f6",
      color: active ? "#ffffff" : "#4b5563",
      transition: "all 0.2s ease-in-out",
    }),
    sendButton: {
      marginLeft: "16px",
      padding: "8px 16px",
      fontSize: "0.75rem",
      fontWeight: 500,
      borderRadius: "9999px",
      border: "none",
      cursor: "pointer",
      backgroundColor: "#de1785",
      color: "#ffffff",
      transition: "all 0.2s ease-in-out",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  };

  // ─── Create-Tab: Validate & forward to parent ────────────────────────────
  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!bodyText.trim()) newErrors.bodyText = true;
    if (templateType === "email" && !subject.trim()) newErrors.subject = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name,
      language,
      category,
      bodyText,
      subject: templateType === "email" ? subject : undefined,
      type: templateType,
    });

    // Reset form afterwards
    setName("");
    setBodyText("");
    setSubject("");
    setErrors({});
  };

  // ─── Clear error flag when user types ────────────────────────────────────
  const handleInputChange = (field: string, value: string) => {
    setErrors((prev) => ({ ...prev, [field]: false }));
    switch (field) {
      case "name":
        setName(value);
        break;
      case "language":
        setLanguage(value);
        break;
      case "category":
        setCategory(value);
        break;
      case "bodyText":
        setBodyText(value);
        break;
      case "subject":
        setSubject(value);
        break;
    }
  };

  // ─── View-Templates Tab: Filter by type & status ────────────────────────
  const filteredTemplates = existingTemplates.filter((t) => {
    if (t.type !== templateType) return false;
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  });

  if (!isOpen) return null;

  // ─── Handler: Send a WhatsApp template for review ────────────────────────
  const internalSendToMeta = async (templateId: string) => {
    setSendingId(templateId);
    try {
      const res = await fetch(
        `${API_BASE}/whatsapp/templates/${templateId}/sendToMeta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userAction: "submit_for_review" }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        console.error("Error sending to Meta:", json);
        alert(
          `Failed to send template for review: ${json.error || res.statusText}`
        );
      } else {
        alert("Template has been sent to Meta for review. Status = PENDING");
        if (onSendToMeta) {
          onSendToMeta(templateId);
        }
      }
    } catch (err: any) {
      console.error("Network error sending to Meta:", err);
      alert("Network error: " + err.message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal Container */}
      <div style={styles.modalContainer}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Message Templates</h2>
          <p style={styles.subtitle}>
            Create and manage your message templates
          </p>

          {/* Tabs */}
          <div style={styles.tabsContainer}>
            <button
              onClick={() => setActiveTab("create")}
              style={styles.tabButton(activeTab === "create")}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab("view")}
              style={styles.tabButton(activeTab === "view")}
            >
              View Templates
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {activeTab === "create" ? (
            <div>
              {/* Template Type Toggle */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Template Type</label>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    padding: "4px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "12px",
                  }}
                >
                  <button
                    onClick={() => setTemplateType("whatsapp")}
                    style={{
                      ...styles.tabButton(templateType === "whatsapp"),
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {/* WhatsApp Icon (inline SVG) */}
                    <svg
                      style={styles.whatsappIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setTemplateType("email")}
                    style={{
                      ...styles.tabButton(templateType === "email"),
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {/* Email Icon (inline SVG) */}
                    <svg
                      style={styles.emailIcon}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                      <path d="M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Template Name</label>
                <input
                  value={name}
                  onChange={(e) =>
                    handleInputChange("name", e.target.value)
                  }
                  placeholder={
                    templateType === "whatsapp"
                      ? "order_confirmation_{{1}}"
                      : "welcome_email"
                  }
                  style={styles.input(Boolean(errors.name))}
                />
                {errors.name && (
                  <p style={styles.errorMsg}>Name is required</p>
                )}
              </div>

              {/* Language & Category Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                {/* Language */}
                <div>
                  <label style={styles.label}>Language</label>
                  <div style={styles.selectWrapper}>
                    <select
                      value={language}
                      onChange={(e) =>
                        handleInputChange("language", e.target.value)
                      }
                      style={styles.select}
                    >
                      <option value="en_US">English (US)</option>
                      <option value="en_GB">English (UK)</option>
                      <option value="es_ES">Spanish</option>
                      <option value="fr_FR">French</option>
                      <option value="de_DE">German</option>
                      <option value="pt_BR">Portuguese</option>
                    </select>
                    <div style={styles.selectIcon}>▾</div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label style={styles.label}>Category</label>
                  <div style={styles.selectWrapper}>
                    <select
                      value={category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      style={styles.select}
                    >
                      <option value="TRANSACTIONAL">Transactional</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                    </select>
                    <div style={styles.selectIcon}>▾</div>
                  </div>
                </div>
              </div>

              {/* Subject (Email Only) */}
              {templateType === "email" && (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Subject Line</label>
                  <input
                    value={subject}
                    onChange={(e) =>
                      handleInputChange("subject", e.target.value)
                    }
                    placeholder="Welcome to our platform!"
                    style={styles.input(Boolean(errors.subject))}
                  />
                  {errors.subject && (
                    <p style={styles.errorMsg}>
                      Subject is required for email templates
                    </p>
                  )}
                </div>
              )}

              {/* Body Text */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Message Body</label>
                <textarea
                  value={bodyText}
                  onChange={(e) =>
                    handleInputChange("bodyText", e.target.value)
                  }
                  placeholder={
                    templateType === "whatsapp"
                      ? "Hello {{1}}, your order {{2}} is confirmed!"
                      : "Dear {{name}},\n\nWelcome to our platform!"
                  }
                  style={styles.textarea(Boolean(errors.bodyText))}
                />
                {errors.bodyText && (
                  <p style={styles.errorMsg}>Message body is required</p>
                )}
                <p style={styles.smallNote}>
                  {templateType === "whatsapp"
                    ? "Use {{1}}, {{2}}, etc. for dynamic variables"
                    : "Use {{variable_name}} for dynamic content"}
                </p>
              </div>
            </div>
          ) : (
            /* ─── View Templates Tab ─────────────────────────────────────── */
            <div>
              {/* Filter Buttons (WhatsApp Only) */}
              {templateType === "whatsapp" && (
                <div style={styles.filterRow}>
                  <button
                    onClick={() => setFilterStatus("all")}
                    style={styles.filterButton(
                      filterStatus === "all",
                      "#de1785"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("approved")}
                    style={styles.filterButton(
                      filterStatus === "approved",
                      "#10b981"
                    )}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    style={styles.filterButton(
                      filterStatus === "pending",
                      "#f59e0b"
                    )}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus("rejected")}
                    style={styles.filterButton(
                      filterStatus === "rejected",
                      "#ef4444"
                    )}
                  >
                    Rejected
                  </button>
                </div>
              )}

              {/* Templates List */}
              {filteredTemplates.length === 0 ? (
                <div style={styles.noTemplatesPlaceholder}>
                  <svg
                    style={{ ...styles.icon, marginBottom: "8px" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 12h6m-6 4h6" />
                    <path d="M21 12v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8" />
                    <path d="M21 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m2-4a2 2 0 0 1-2 2h18a2 2 0 0 1-2-2" />
                  </svg>
                  No templates found
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      ...styles.templateCard,
                      marginBottom: "16px",
                    }}
                    onMouseEnter={(e) =>
                      (
                        e.currentTarget as HTMLDivElement
                      ).style.borderColor = "#d1d5db"
                    }
                    onMouseLeave={(e) =>
                      (
                        e.currentTarget as HTMLDivElement
                      ).style.borderColor = "#e5e7eb"
                    }
                  >
                    <div style={styles.templateInfo}>
                      <div style={styles.templateNameRow}>
                        <h4 style={styles.templateTitle}>{template.name}</h4>
                        {templateType === "whatsapp" && (
                          <span style={styles.statusBadge(template.status)}>
                            {template.status}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          color: "#4b5563",
                          fontSize: "0.875rem",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                        }}
                      >
                        {template.bodyText}
                      </p>
                      <div style={styles.templateMetaRow}>
                        <span>{template.language}</span>
                        <span>{template.category}</span>
                        <span>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {templateType === "whatsapp" &&
                      template.status === "pending" && (
                        <button
                          onClick={() => internalSendToMeta(template.id)}
                          disabled={sendingId === template.id}
                          style={{
                            ...styles.sendButton,
                            ...(sendingId === template.id
                              ? styles.disabledButton
                              : {}),
                          }}
                        >
                          {sendingId === template.id
                            ? "Sending..."
                            : "Send to Meta"}
                        </button>
                      )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.buttonSecondary}>
            Cancel
          </button>
          {activeTab === "create" && (
            <button onClick={handleSubmit} style={styles.buttonPrimary}>
              Create Template
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TemplateModal;