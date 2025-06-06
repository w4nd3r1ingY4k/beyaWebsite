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
      <div
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-[1000]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-lg w-[90%] max-w-[720px] max-h-[90vh] flex flex-col transition-opacity duration-200 ease-in-out overflow-hidden z-[1001]">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Message Templates</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your message templates
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 px-6 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
                activeTab === "create"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-transparent text-gray-700"
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`flex-1 py-2 px-6 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
                activeTab === "view"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-transparent text-gray-700"
              }`}
            >
              View Templates
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="py-6 px-8 overflow-y-auto flex-1">
          {activeTab === "create" ? (
            <div>
              {/* Template Type Toggle */}
              <div className="mb-6">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Template Type
                </label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setTemplateType("whatsapp")}
                    className={`flex items-center gap-2 py-2 px-6 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
                      templateType === "whatsapp"
                        ? "bg-white text-gray-900 shadow"
                        : "bg-transparent text-gray-700"
                    }`}
                  >
                    {/* WhatsApp Icon */}
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setTemplateType("email")}
                    className={`flex items-center gap-2 py-2 px-6 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
                      templateType === "email"
                        ? "bg-white text-gray-900 shadow"
                        : "bg-transparent text-gray-700"
                    }`}
                  >
                    {/* Email Icon */}
                    <svg
                      className="w-4 h-4"
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
              <div className="mb-6">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Template Name
                </label>
                <input
                  value={name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder={
                    templateType === "whatsapp"
                      ? "order_confirmation_{{1}}"
                      : "welcome_email"
                  }
                  className={`w-full py-3 px-4 text-base rounded-xl focus:outline-none transition border duration-200 ease-in-out ${
                    errors.name
                      ? "border-red-400 bg-red-50 text-gray-900"
                      : "border-gray-300 bg-gray-50 text-gray-900"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-700">Name is required</p>
                )}
              </div>

              {/* Language & Category Row */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Language */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) =>
                        handleInputChange("language", e.target.value)
                      }
                      className="w-full appearance-none py-3 pl-4 pr-10 text-base rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none transition border duration-200 ease-in-out cursor-pointer"
                    >
                      <option value="en_US">English (US)</option>
                      <option value="en_GB">English (UK)</option>
                      <option value="es_ES">Spanish</option>
                      <option value="fr_FR">French</option>
                      <option value="de_DE">German</option>
                      <option value="pt_BR">Portuguese</option>
                    </select>
                    <div className="absolute inset-y-1/2 right-4 transform -translate-y-1/2 pointer-events-none text-gray-400 text-sm">
                      ▾
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) =>
                        handleInputChange("category", e.target.value)
                      }
                      className="w-full appearance-none py-3 pl-4 pr-10 text-base rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none transition border duration-200 ease-in-out cursor-pointer"
                    >
                      <option value="TRANSACTIONAL">Transactional</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                    </select>
                    <div className="absolute inset-y-1/2 right-4 transform -translate-y-1/2 pointer-events-none text-gray-400 text-sm">
                      ▾
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject (Email Only) */}
              {templateType === "email" && (
                <div className="mb-6">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Subject Line
                  </label>
                  <input
                    value={subject}
                    onChange={(e) =>
                      handleInputChange("subject", e.target.value)
                    }
                    placeholder="Welcome to our platform!"
                    className={`w-full py-3 px-4 text-base rounded-xl focus:outline-none transition border duration-200 ease-in-out ${
                      errors.subject
                        ? "border-red-400 bg-red-50 text-gray-900"
                        : "border-gray-300 bg-gray-50 text-gray-900"
                    }`}
                  />
                  {errors.subject && (
                    <p className="mt-1 text-xs text-red-700">
                      Subject is required for email templates
                    </p>
                  )}
                </div>
              )}

              {/* Body Text */}
              <div className="mb-6">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Message Body
                </label>
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
                  className={`w-full h-36 resize-y py-3 px-4 text-base rounded-xl focus:outline-none transition border duration-200 ease-in-out ${
                    errors.bodyText
                      ? "border-red-400 bg-red-50 text-gray-900"
                      : "border-gray-300 bg-gray-50 text-gray-900"
                  }`}
                />
                {errors.bodyText && (
                  <p className="mt-1 text-xs text-red-700">
                    Message body is required
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
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
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className={`py-2 px-4 text-xs font-medium rounded-full transition-all duration-200 ease-in-out ${
                      filterStatus === "all"
                        ? "bg-pink-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus("approved")}
                    className={`py-2 px-4 text-xs font-medium rounded-full transition-all duration-200 ease-in-out ${
                      filterStatus === "approved"
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilterStatus("pending")}
                    className={`py-2 px-4 text-xs font-medium rounded-full transition-all duration-200 ease-in-out ${
                      filterStatus === "pending"
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus("rejected")}
                    className={`py-2 px-4 text-xs font-medium rounded-full transition-all duration-200 ease-in-out ${
                      filterStatus === "rejected"
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Rejected
                  </button>
                </div>
              )}

              {/* Templates List */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <svg
                    className="w-6 h-6 mb-2 text-gray-400"
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
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between cursor-pointer transition-all duration-200 ease-in-out hover:border-gray-300"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-medium text-gray-900 m-0">
                          {template.name}
                        </h4>
                        {templateType === "whatsapp" && (
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                              template.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : template.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {template.status}
                          </span>
                        )}
                      </div>
                      <p className="m-0 text-gray-700 text-sm overflow-hidden line-clamp-2">
                        {template.bodyText}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
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
                          className={`ml-4 py-2 px-4 text-xs font-medium rounded-full bg-pink-600 text-white transition-all duration-200 ease-in-out ${
                            sendingId === template.id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
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
        <div className="py-6 px-8 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-6 text-sm font-medium rounded-full border border-gray-300 bg-white text-gray-700 cursor-pointer transition-all duration-200 ease-in-out"
          >
            Cancel
          </button>
          {activeTab === "create" && (
            <button
              onClick={handleSubmit}
              className="py-2.5 px-6 text-sm font-medium rounded-full bg-pink-600 text-white shadow-md cursor-pointer transition-all duration-200 ease-in-out"
            >
              Create Template
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TemplateModal;
