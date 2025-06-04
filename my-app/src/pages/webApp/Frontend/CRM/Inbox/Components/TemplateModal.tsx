import React, { useState } from "react";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  bodyText: string;
  subject?: string;
  type: 'whatsapp' | 'email';
  status: 'approved' | 'pending' | 'rejected';
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
    type: 'whatsapp' | 'email';
  }) => void;
  onSendToMeta?: (templateId: string) => void;
  existingTemplates?: Template[];
}

// ─────────── Adjust this to match your actual backend base URL ───────────
const API_BASE = "https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod";

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSendToMeta,
  existingTemplates = []
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>('create');
  const [templateType, setTemplateType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState("TRANSACTIONAL");
  const [bodyText, setBodyText] = useState("");
  const [subject, setSubject] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [sendingId, setSendingId] = useState<string | null>(null); // For tracking which template is being sent  

  // ─────────── Create-Tab: Validate & forward to parent ───────────
  const handleSubmit = () => {
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!bodyText.trim()) newErrors.bodyText = true;
    if (templateType === 'email' && !subject.trim()) newErrors.subject = true;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit({ 
      name, 
      language, 
      category, 
      bodyText,
      subject: templateType === 'email' ? subject : undefined,
      type: templateType
    });
    
    // Reset form afterwards
    setName("");
    setBodyText("");
    setSubject("");
    setErrors({});
  };

  // ─────────── Inputs: Clear error flag when user types ───────────
  const handleInputChange = (field: string, value: string) => {
    setErrors(prev => ({ ...prev, [field]: false }));
    switch(field) {
      case 'name': setName(value); break;
      case 'language': setLanguage(value); break;
      case 'category': setCategory(value); break;
      case 'bodyText': setBodyText(value); break;
      case 'subject': setSubject(value); break;
    }
  };

  // ─────────── “View Templates” Tab: Filter by type & status ───────────
  const filteredTemplates = existingTemplates.filter(t => {
    if (t.type !== templateType) return false;
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  if (!isOpen) return null;

  // ─────────── Handler: Call backend to submit a WhatsApp template for review ───────────
  const internalSendToMeta = async (templateId: string) => {
    setSendingId(templateId);                 // mark as “in progress”
    try {
      const res = await fetch(
        `${API_BASE}/whatsapp/templates/${templateId}/sendToMeta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // If your endpoint needs additional body data, include it here.
          // This example assumes the URL itself and POST are enough.
          body: JSON.stringify({ userAction: "submit_for_review" }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        console.error("Error sending to Meta:", json);
        alert(`Failed to send template for review: ${json.error || res.statusText}`);
      } else {
        alert("Template has been sent to Meta for review. Status = PENDING_APPROVAL");
        // If parent passed an onSendToMeta prop, call it so parent can refresh state:
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* ─── Backdrop ─── */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* ─── Modal Container ─── */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ─── Header ─── */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900">
            Message Templates
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your message templates
          </p>
          
          {/* ─── Tabs ─── */}
          <div className="flex gap-1 mt-6 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'create' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'view' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              View Templates
            </button>
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="px-8 py-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              {/* ─── Template Type Toggle ─── */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Template Type
                </label>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setTemplateType('whatsapp')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      templateType === 'whatsapp' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setTemplateType('email')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      templateType === 'email' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                </div>
              </div>

              {/* ─── Name Input ─── */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Template Name
                </label>
                <input
                  value={name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={templateType === 'whatsapp' ? "order_confirmation_{{1}}" : "welcome_email"}
                  className={`w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:border-transparent transition-all duration-200 ${
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">Name is required</p>
                )}
              </div>

              {/* ─── Language & Category Row ─── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Language Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:border-transparent transition-all duration-200 cursor-pointer"
                    >
                      <option value="en_US">English (US)</option>
                      <option value="en_GB">English (UK)</option>
                      <option value="es_ES">Spanish</option>
                      <option value="fr_FR">French</option>
                      <option value="de_DE">German</option>
                      <option value="pt_BR">Portuguese</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Category Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:border-transparent transition-all duration-200 cursor-pointer"
                    >
                      <option value="TRANSACTIONAL">Transactional</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Subject Line (Email only) ─── */}
              {templateType === 'email' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Subject Line
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Welcome to our platform!"
                    className={`w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:border-transparent transition-all duration-200 ${
                      errors.subject ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.subject && (
                    <p className="text-xs text-red-600">Subject is required for email templates</p>
                  )}
                </div>
              )}

              {/* ─── Body Text ─── */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Message Body
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => handleInputChange('bodyText', e.target.value)}
                  placeholder={
                    templateType === 'whatsapp' 
                      ? "Hello {{1}}, your order {{2}} is confirmed. Thank you for shopping with us!"
                      : "Dear {{name}},\n\nWelcome to our platform! We're excited to have you on board.\n\nBest regards,\nThe Team"
                  }
                  rows={6}
                  className={`w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-gray-50 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:border-transparent transition-all duration-200 ${
                    errors.bodyText ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.bodyText && (
                  <p className="text-xs text-red-600">Message body is required</p>
                )}
                <p className="text-xs text-gray-500">
                  {templateType === 'whatsapp' 
                    ? 'Use {{1}}, {{2}}, etc. for dynamic variables'
                    : 'Use {{variable_name}} for dynamic content'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ─── Filter (WhatsApp only) ─── */}
              {templateType === 'whatsapp' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      filterStatus === 'all' 
                        ? 'bg-[#DE1785] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('approved')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      filterStatus === 'approved' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      filterStatus === 'pending' 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('rejected')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                      filterStatus === 'rejected' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Rejected
                  </button>
                </div>
              )}

              {/* ─── Templates List ─── */}
              <div className="space-y-3">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">No templates found</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div key={template.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            {templateType === 'whatsapp' && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                template.status === 'approved' 
                                  ? 'bg-green-100 text-green-700' 
                                  : template.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {template.status}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.bodyText}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{template.language}</span>
                            <span>{template.category}</span>
                            <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {templateType === 'whatsapp' && template.status === 'pending' && (
                          <button
                            onClick={() => internalSendToMeta(template.id)}
                            disabled={sendingId === template.id}
                            className="ml-4 px-3 py-1.5 text-xs font-medium text-white bg-[#DE1785] rounded-full hover:bg-[#C21570] focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendingId === template.id ? "Sending…" : "Send to Meta"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-8 py-6 bg-gray-50 rounded-b-3xl flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
          >
            Cancel
          </button>
          {activeTab === 'create' && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#DE1785] rounded-full hover:bg-[#C21570] focus:outline-none focus:ring-2 focus:ring-[#DE1785] focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-[#DE1785]/25"
            >
              Create Template
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;