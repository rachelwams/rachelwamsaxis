import React, { useState, useId } from 'react';
import {
  Mail,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  UserX,
  HelpCircle,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  Calendar,
  ListFilter,
  CheckSquare,
  Square
} from 'lucide-react';

interface RachelActionItem {
  id: string;
  title: string;
  details: string;
  deadline?: string;
  urgency?: string;
}

interface SkippedActionItem {
  id: string;
  title: string;
  assignedTo: string;
  reasonSkipped: string;
}

interface DraftEmail {
  id: string;
  actionItemId: string;
  actionItemTitle: string;
  to: string;
  subject: string;
  body: string;
  signOff: string;
}

interface QuestionForUser {
  id: string;
  question: string;
  context?: string;
}

interface ApiResponse {
  rachelActionItems: RachelActionItem[];
  skippedActionItems: SkippedActionItem[];
  draftEmails: DraftEmail[];
  questionsForUser: QuestionForUser[];
}

const SAMPLE_MEETING_NOTES = `Axis Connects - Weekly All-Hands & Community Strategy
Date: Tuesday, October 28
Attendees: Rachel (Community Engagement), Devon (Finance & Sponsorships), Priya (Operations & Events), Marcus (Executive Director)

Agenda & Discussion:
1. Annual Calgary Leadership Awards Gala (Event size: 250 attendees):
- Rachel to email TC Energy corporate sponsorship contact regarding gala table sponsorship packages. Introduce Axis Connects, mention our 250 attendees, and ask for an introduction if someone else on their team handles sponsorships.
- Rachel to follow up with keynote speaker Dr. Aris Thorne re: presentation slides deadline (Nov 15) and dinner dietary requirements.

2. LWAL (Lunch with a Leader) Series:
- Next LWAL session scheduled for late November.
- Rachel to email volunteer table mentors to confirm availability for the upcoming LWAL luncheon.

3. Alberta Community Partner Roundtables:
- Rachel to email Sarah at Platform Calgary to secure classroom space for Nov 22 mixer and request community partner discount rate.

4. Other team tasks:
- Devon to balance volunteer swag budget.
- Priya to handle catering quotes with local vendors by Friday.`;

export default function App() {
  const [meetingNotes, setMeetingNotes] = useState('');
  const [senderName, setSenderName] = useState('Rachel');
  const [senderRole, setSenderRole] = useState('Manager of Community Engagement');
  const [organization, setOrganization] = useState('Axis Connects');
  const [tonePreference, setTonePreference] = useState('warm-collaborative');
  const [customToneNote, setCustomToneNote] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [friendlyNotice, setFriendlyNotice] = useState<string | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  // Editable drafts stored in local state so Rachel can tweak them
  const [editedDrafts, setEditedDrafts] = useState<Record<string, DraftEmail>>({});
  const [copyStatus, setCopyStatus] = useState<Record<string, 'full' | 'body' | null>>({});
  const [copyAllStatus, setCopyAllStatus] = useState(false);
  const [resolvedQuestions, setResolvedQuestions] = useState<Record<string, boolean>>({});
  const [showSkipped, setShowSkipped] = useState(true);

  const notesTextareaId = useId();

  const handleLoadSample = () => {
    setMeetingNotes(SAMPLE_MEETING_NOTES);
    setErrorMessage(null);
    setFriendlyNotice(null);
  };

  const handleGenerate = async () => {
    if (!meetingNotes.trim()) {
      setFriendlyNotice(
        "Please paste or type your meeting notes in the box above, or click 'Try a sample' to test with an example!"
      );
      setErrorMessage(null);
      return;
    }

    setFriendlyNotice(null);
    setIsLoading(true);
    setErrorMessage(null);

    let toneDesc = '';
    if (tonePreference === 'warm-collaborative') {
      toneDesc = 'Warm, appreciative, and collaborative community non-profit tone.';
    } else if (tonePreference === 'concise-direct') {
      toneDesc = 'Concise, clear, and action-oriented bulleted follow-up.';
    } else if (tonePreference === 'formal-sponsor') {
      toneDesc = 'Professional, polished, and structured for external sponsors and VIP partners.';
    }
    if (customToneNote.trim()) {
      toneDesc += ` ${customToneNote.trim()}`;
    }

    try {
      const res = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNotes,
          senderName,
          senderRole,
          organization,
          extraContext: toneDesc,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process notes');
      }

      setResponse(data);

      // Initialize edited drafts mapping
      const draftsMap: Record<string, DraftEmail> = {};
      if (Array.isArray(data.draftEmails)) {
        data.draftEmails.forEach((draft: DraftEmail) => {
          draftsMap[draft.id] = { ...draft };
        });
      }
      setEditedDrafts(draftsMap);
      setResolvedQuestions({});
      setCopyStatus({});

      // Scroll smoothly to output
      setTimeout(() => {
        document.getElementById('action-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Something went wrong while connecting to the AI assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftFieldChange = (draftId: string, field: keyof DraftEmail, value: string) => {
    setEditedDrafts((prev) => ({
      ...prev,
      [draftId]: {
        ...prev[draftId],
        [field]: value,
      },
    }));
  };

  const copyToClipboard = async (text: string, draftId: string, type: 'full' | 'body') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus((prev) => ({ ...prev, [draftId]: type }));
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [draftId]: null }));
      }, 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleCopyFullEmail = (draftId: string) => {
    const draft = editedDrafts[draftId];
    if (!draft) return;
    const signOff = draft.signOff || "Thank you!\nRachel";
    const fullText = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}\n\n${signOff}`;
    copyToClipboard(fullText, draftId, 'full');
  };

  const handleCopyBodyOnly = (draftId: string) => {
    const draft = editedDrafts[draftId];
    if (!draft) return;
    const signOff = draft.signOff || "Thank you!\nRachel";
    const bodyText = `${draft.body}\n\n${signOff}`;
    copyToClipboard(bodyText, draftId, 'body');
  };

  const handleCopyAllDrafts = async () => {
    if (!response || !response.draftEmails.length) return;
    const allText = response.draftEmails
      .map((d, index) => {
        const live = editedDrafts[d.id] || d;
        const signOff = live.signOff || "Thank you!\nRachel";
        return `========================================\nEMAIL ${index + 1}: ${live.actionItemTitle}\n========================================\nTo: ${live.to}\nSubject: ${live.subject}\n\n${live.body}\n\n${signOff}\n`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      setCopyAllStatus(true);
      setTimeout(() => setCopyAllStatus(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQuestionResolved = (id: string) => {
    setResolvedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenMailto = (draftId: string) => {
    const draft = editedDrafts[draftId];
    if (!draft) return;

    // Extract clean email if present in brackets or email format
    let cleanTo = draft.to;
    const emailMatch = draft.to.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    if (emailMatch) {
      cleanTo = emailMatch[1];
    } else if (draft.to.includes('[') || draft.to.includes('(')) {
      cleanTo = ''; // Leave blank if it's a generic placeholder like [Speaker Name]
    }

    const mailtoUrl = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(
      draft.subject
    )}&body=${encodeURIComponent(`${draft.body}\n\n${draft.signOff}`)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Axis Action Mailer</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200/60">
                  Axis Connects
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Weekly Meeting Follow-Up Drafter for{' '}
                <span className="font-semibold text-slate-700">{senderName}</span> ({senderRole})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Try a sample
            </button>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Role & Tone
              {showConfig ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {response && response.draftEmails.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAllDrafts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-2xs cursor-pointer"
              >
                {copyAllStatus ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    All Drafts Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All Drafts
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Role & Context Settings */}
        {showConfig && (
          <div className="border-t border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-4 animate-in fade-in duration-150">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Rachel"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Title / Role</label>
                <input
                  type="text"
                  value={senderRole}
                  onChange={(e) => setSenderRole(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Manager of Community Engagement"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Axis Connects"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tone & Voice</label>
                <select
                  value={tonePreference}
                  onChange={(e) => setTonePreference(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="warm-collaborative">Warm & Collaborative (Recommended)</option>
                  <option value="concise-direct">Concise & Action-Oriented</option>
                  <option value="formal-sponsor">Formal & Partner-Ready</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Optional Additional Guidance or Notes:
                </label>
                <input
                  type="text"
                  value={customToneNote}
                  onChange={(e) => setCustomToneNote(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-700"
                  placeholder="e.g. Mention we are based in Calgary, keep under 3 paragraphs..."
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                Action Item Follow-Up Engine
              </span>
              <span className="text-xs text-teal-300/80">Tailored for Rachel at Axis Connects</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Turn weekly team meeting notes into instant action drafts
            </h2>
            <p className="text-sm text-teal-100/85 max-w-2xl">
              Paste your raw notes below. Gemini identifies the action items assigned to you, excludes tasks meant for others, drafts complete follow-up emails with one-click copy buttons, and highlights questions for you to verify.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-teal-500/30 hover:bg-teal-500/40 text-teal-100 border border-teal-300/40 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-teal-200" />
            Try a sample
          </button>
        </div>

        {/* Input Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-3">
              <label htmlFor={notesTextareaId} className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Raw Meeting Notes
              </label>

              {/* Prominent 'Try a sample' button right by the input */}
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Try a sample
              </button>
            </div>

            <div className="flex items-center gap-2">
              {meetingNotes && (
                <button
                  type="button"
                  onClick={() => {
                    setMeetingNotes('');
                    setFriendlyNotice(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active Drafting Rules Checklist */}
          <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[10px]">
              Active Drafting Rules:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Greetings: <code className="text-slate-800 font-mono text-[10px]">"Hello [Name],"</code> (sponsors) • <code className="text-slate-800 font-mono text-[10px]">"Hi [Name],"</code> (volunteers)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Abbreviation: <strong className="text-slate-800">LWAL = Lunch with a Leader only</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Sponsor outreach: Intro as Rachel (Mgr Community Engagement), mention event size, ask for referral if handled by another
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Unstated details tagged as <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono text-[10px]">[SUGGESTED: ..., please confirm]</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Missing info tagged <span className="bg-sky-100 text-sky-900 px-1 py-0.2 rounded font-mono text-[10px]">[PLACEHOLDER: ..., check shared Drive]</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Sign-off strictly: <strong className="text-slate-800">Thank you! / Rachel</strong>
              </span>
              <span className="flex items-center gap-1.5 sm:col-span-3">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                Short paragraphs with blank lines • No generic openings like "I hope you are having a wonderful week"
              </span>
            </div>
          </div>

          <div className="relative">
            <textarea
              id={notesTextareaId}
              rows={8}
              value={meetingNotes}
              onChange={(e) => {
                setMeetingNotes(e.target.value);
                if (friendlyNotice && e.target.value.trim()) {
                  setFriendlyNotice(null);
                }
              }}
              placeholder="Paste raw meeting notes here...&#10;&#10;e.g.&#10;• Rachel to email keynote speaker re: presentation slides and AV requirements&#10;• Devon to follow up on outstanding sponsor invoices&#10;• Rachel to contact Platform Calgary for room reservation for Nov 22 mixer"
              className="w-full text-sm font-mono p-4 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-y"
            />
          </div>

          {/* Friendly notice when empty instead of an error */}
          {friendlyNotice && (
            <div className="mt-3 p-4 rounded-xl bg-teal-50/90 border border-teal-200 text-teal-900 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-teal-950">Ready when you are!</p>
                  <p className="text-teal-800 leading-relaxed">
                    {friendlyNotice}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Try a sample
              </button>
            </div>
          )}

          {/* Actual system / API error message if an unexpected failure occurs */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Assigned to filter: <span className="font-semibold text-slate-700">{senderName}</span>
              <span className="text-slate-300">•</span>
              <span>No Gmail, Drive, or Calendar connection needed</span>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white shadow-sm transition-all disabled:cursor-not-allowed hover:shadow-md cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Notes with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-200" />
                  <span>Extract Action Items & Draft Emails</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {response && (
          <div id="action-results" className="space-y-6 pt-2">
            {/* 1. HIGHLIGHTED BOX AT THE TOP: 'Questions for you' section */}
            {response.questionsForUser && response.questionsForUser.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50/90 via-amber-50 to-orange-50/80 border-2 border-amber-300 rounded-2xl p-5 shadow-sm ring-4 ring-amber-100/60 animate-in fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-200 rounded-xl text-amber-900 shrink-0 mt-0.5 shadow-2xs">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-200 text-amber-950 border border-amber-300">
                          Review First
                        </span>
                        <h3 className="text-base font-extrabold text-amber-950 tracking-tight">
                          Questions for you
                        </h3>
                      </div>
                      <span className="text-xs text-amber-900 font-semibold bg-white/90 px-3 py-1 rounded-full border border-amber-200 shadow-2xs">
                        {Object.values(resolvedQuestions).filter(Boolean).length} of{' '}
                        {response.questionsForUser.length} checked
                      </span>
                    </div>

                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      Before sending your follow-up emails, please verify these key details flagged from your meeting notes:
                    </p>

                    <div className="mt-3 space-y-2 pt-1">
                      {response.questionsForUser.map((q, index) => {
                        const isChecked = resolvedQuestions[q.id || String(index)];
                        return (
                          <div
                            key={q.id || index}
                            onClick={() => toggleQuestionResolved(q.id || String(index))}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                              isChecked
                                ? 'bg-amber-100/60 border-amber-300/70 opacity-60'
                                : 'bg-white border-amber-200 hover:border-amber-300 shadow-2xs'
                            }`}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-amber-700 shrink-0 cursor-pointer"
                              aria-label="Toggle question checked state"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-amber-600" />
                              )}
                            </button>
                            <div className="space-y-0.5 text-xs">
                              <p
                                className={`font-semibold ${
                                  isChecked ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {q.question}
                              </p>
                              {q.context && (
                                <p className="text-[11px] text-slate-600">{q.context}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Action Items Overview Banner & Filter Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-teal-50 rounded-lg text-teal-700 border border-teal-100">
                    <ListFilter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Action Items Analysis & Assignment Filter
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scanned notes for tasks assigned to {senderName} vs. other team members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {response.rachelActionItems?.length || 0} Assigned to {senderName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <UserX className="w-3.5 h-3.5 text-slate-400" />
                    {response.skippedActionItems?.length || 0} Skipped
                  </span>
                </div>
              </div>

              {/* Grid: Rachel's items and Skipped items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                {/* Rachel's items */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      {senderName}'s Action Items (Email Drafted)
                    </span>
                    <span className="text-slate-400 text-[11px] font-normal">
                      Click to jump to draft
                    </span>
                  </div>

                  {response.rachelActionItems?.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                      No direct action items found assigned to {senderName} in these notes.
                    </div>
                  ) : (
                    response.rachelActionItems?.map((item, idx) => (
                      <a
                        key={item.id || idx}
                        href={`#draft-${item.id}`}
                        className="block p-3.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/80 transition-all hover:shadow-xs group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                                {item.title}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                              {item.details}
                            </p>
                          </div>

                          {item.deadline && item.deadline !== 'Not specified' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 shrink-0">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              {item.deadline}
                            </span>
                          )}
                        </div>
                      </a>
                    ))
                  )}
                </div>

                {/* Skipped items */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <UserX className="w-4 h-4 text-slate-400" />
                      Skipped Items (Assigned to Others / General)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSkipped(!showSkipped)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      {showSkipped ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  {showSkipped && (
                    <div className="space-y-2">
                      {response.skippedActionItems?.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No other items found.
                        </div>
                      ) : (
                        response.skippedActionItems?.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 line-clamp-1">
                                {item.title}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-200/80 text-slate-700 shrink-0">
                                {item.assignedTo}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                              Skipped: {item.reasonSkipped}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Draft Emails Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                    {response.draftEmails?.length || 0}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Generated Follow-up Draft Emails
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review, make direct edits if needed, and use the copy button under each email to paste into your mail app
                    </p>
                  </div>
                </div>
              </div>

              {response.draftEmails?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                  No action items assigned to {senderName} were found in the notes.
                </div>
              ) : (
                response.draftEmails?.map((originalDraft, index) => {
                  const draftId = originalDraft.id || `draft-${index}`;
                  const currentDraft = editedDrafts[draftId] || originalDraft;
                  const currentCopyStatus = copyStatus[draftId];

                  return (
                    <article
                      key={draftId}
                      id={`draft-${originalDraft.actionItemId || draftId}`}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    >
                      {/* Email Card Header */}
                      <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block text-[10px]">
                              Action Item
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              {currentDraft.actionItemTitle}
                            </h4>
                          </div>
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyFullEmail(draftId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-2xs cursor-pointer"
                          >
                            {currentCopyStatus === 'full' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Email</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Email Editor / Viewer */}
                      <div className="p-5 space-y-4">
                        {/* To Field */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <label className="sm:w-20 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            To:
                          </label>
                          <input
                            type="text"
                            value={currentDraft.to}
                            onChange={(e) => handleDraftFieldChange(draftId, 'to', e.target.value)}
                            className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800"
                            placeholder="Recipient name or email..."
                          />
                        </div>

                        {/* Subject Field */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <label className="sm:w-20 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Subject:
                          </label>
                          <input
                            type="text"
                            value={currentDraft.subject}
                            onChange={(e) =>
                              handleDraftFieldChange(draftId, 'subject', e.target.value)
                            }
                            className="flex-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-900"
                            placeholder="Subject line..."
                          />
                        </div>

                        {/* Body Field with Rule Detection Badges */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Email Body:
                            </label>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {currentDraft.body.includes('[SUGGESTED:') && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                  ⚠️ Contains [SUGGESTED: ... please confirm]
                                </span>
                              )}
                              {currentDraft.body.includes('[PLACEHOLDER:') && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300">
                                  📁 Contains [PLACEHOLDER: ... check shared Drive]
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                {currentDraft.body.split(/\s+/).filter(Boolean).length} words
                              </span>
                            </div>
                          </div>
                          <textarea
                            rows={7}
                            value={currentDraft.body}
                            onChange={(e) =>
                              handleDraftFieldChange(draftId, 'body', e.target.value)
                            }
                            className="w-full text-xs font-sans p-3.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800 leading-relaxed resize-y font-mono whitespace-pre-wrap"
                          />
                        </div>

                        {/* Sign-off Field */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Sign-off & Signature:
                            </label>
                            <span className="text-[11px] text-teal-700 font-medium">
                              Rule: Exactly "Thank you!" + "Rachel"
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={currentDraft.signOff || "Thank you!\nRachel"}
                            onChange={(e) =>
                              handleDraftFieldChange(draftId, 'signOff', e.target.value)
                            }
                            className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 text-slate-800 leading-snug resize-y"
                          />
                        </div>

                        {/* DEDICATED PROMINENT COPY BUTTON SECTION DIRECTLY UNDER EACH EMAIL */}
                        <div className="pt-4 border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-xl">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Primary Copy Button Under Each Email */}
                            <button
                              type="button"
                              onClick={() => handleCopyFullEmail(draftId)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs hover:shadow-md cursor-pointer"
                            >
                              {currentCopyStatus === 'full' ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-200" />
                                  <span>Copied Full Email to Clipboard!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy Email</span>
                                </>
                              )}
                            </button>

                            {/* Secondary Copy Body Only */}
                            <button
                              type="button"
                              onClick={() => handleCopyBodyOnly(draftId)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              {currentCopyStatus === 'body' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copied Body!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Copy Body Only</span>
                                </>
                              )}
                            </button>

                            {/* Open in Mail Client */}
                            <button
                              type="button"
                              onClick={() => handleOpenMailto(draftId)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              <span>Open in Mail App</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleDraftFieldChange(draftId, 'to', originalDraft.to);
                              handleDraftFieldChange(draftId, 'subject', originalDraft.subject);
                              handleDraftFieldChange(draftId, 'body', originalDraft.body);
                              handleDraftFieldChange(draftId, 'signOff', originalDraft.signOff);
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 px-2 py-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset to original
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
