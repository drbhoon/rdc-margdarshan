'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Notebook,
  Lock,
  MessageSquare,
  Sparkles,
  Bookmark,
  Plus,
  Send,
  Video,
  Eye,
  FileText,
  AlertTriangle,
  User,
  Info,
} from 'lucide-react';

const WEEK_THEMES = [
  { week: 0, title: 'Kick-off & Contracting', objectives: 'Define boundaries, SARTAJ safety ownership, mutual expectations, and co-create development milestones.' },
  { week: 1, title: 'Communication & Assertiveness', objectives: 'Analyze DISC behavioral styles, upward communication, and establish assertiveness on the shop floor.' },
  { week: 2, title: 'Functional Knowledge & Multiskilling', objectives: 'Audit technical competencies, equipment blueprints, cross-skilling tracks, and identify knowledge gaps.' },
  { week: 3, title: 'Planning, Organizing & Coordination', objectives: 'Define long-term operational vision, project scheduling, and structured coordination routines.' },
  { week: 4, title: 'Cost & Resource Responsibility', objectives: 'Identify operational waste, CAPEX/OPEX resource stewardship, and cost-optimization levers.' },
  { week: 5, title: 'Integrity & Trust', objectives: 'Examine governance rigor, compliance standards, and deliver evidence-based feedback.' },
  { week: 6, title: 'Mid-Point Pulse Check', objectives: 'Submit mid-cohort pulse survey, evaluate 5.6x systemic cascade evaluations, and recalibrate goals.' },
  { week: 7, title: 'Customer Orientation & Relationships', objectives: 'Master internal/external customer relationship handling, SLA commitments, and stakeholder trust.' },
  { week: 8, title: 'Preventive Maintenance & Asset Care', objectives: 'Institutionalize Total Productive Maintenance (TPM), autonomous care checklists, and zero-downtime practices.' },
  { week: 9, title: 'Vendor & External Stakeholder Mgmt', objectives: 'Navigate contract SLAs, commercial terms negotiations, and strategic vendor dispute resolution.' },
  { week: 10, title: 'Team Orientation & Delegation', objectives: 'Build high-accountability engineering squads, effective task delegation, and cross-functional team cohesion.' },
  { week: 11, title: 'Safety, Discipline & SARTAJ Ownership', objectives: 'Institutionalize 100% SARTAJ safety culture, proactive hazard reporting, and operational discipline.' },
  { week: 12, title: 'Close-out & Feedback', objectives: 'Conduct final competency mastery evaluation, review growth ratings, and generate the official PDF summary.' },
];

export default function MentoringSpacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { pairId } = useParams() as { pairId: string };

  const [data, setData] = useState<any>(null);
  const [spaceLoading, setSpaceLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected week index
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Tabs: 'NOTES', 'ACTIONS', 'PRIVATE', 'RESOURCES'
  const [activeTab, setActiveTab] = useState<'NOTES' | 'ACTIONS' | 'PRIVATE' | 'RESOURCES'>('NOTES');

  // Input states
  const [scheduleDate, setScheduleDate] = useState('');
  const [goalsInput, setGoalsInput] = useState('');
  const [isEditingAgenda, setIsEditingAgenda] = useState(false);
  const [customAgendaText, setCustomAgendaText] = useState('');
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [notesInput, setNotesInput] = useState({
    discussionPoints: '',
    insights: '',
    commitments: '',
    supportNeeded: '',
    preSessionNotes: '',
    postReflection: '',
  });
  const [savingNotes, setSavingNotes] = useState(false);

  // Action Items states
  const [actionTitle, setActionTitle] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [actionDueDate, setActionDueDate] = useState('');
  const [actionAssignee, setActionAssignee] = useState('');

  // Private note input
  const [privateNoteInput, setPrivateNoteInput] = useState('');

  // Survey states
  const [surveyRating, setSurveyRating] = useState(5);
  const [surveyText, setSurveyText] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  // AI Co-Pilot Panel states
  const [aiMessage, setAiMessage] = useState('');
  const [aiChat, setAiChat] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your Margdarshan AI Assistant. I have context on your roles, DISC profiles, and this week\'s goals. Ask me for recommendations or advice!' },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchSpaceData = async () => {
    try {
      const res = await fetch(`/api/pair/${pairId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.pair?.sharedGoals) {
          setGoalsInput(json.pair.sharedGoals);
        }
      } else {
        setError('Failed to fetch mentoring space.');
      }
    } catch (e) {
      setError('Connection failure.');
    } finally {
      setSpaceLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (pairId) {
      fetchSpaceData();
    }
  }, [pairId, user, loading]);

  // Load session notes and custom agenda when changing selected week
  const activeSession = data?.pair?.sessions?.find((s: any) => s.weekNumber === selectedWeek);
  useEffect(() => {
    if (activeSession) {
      setCustomAgendaText(activeSession.discussionPoints || '');
      setIsEditingAgenda(false);
      setNotesInput({
        discussionPoints: activeSession.discussionPoints || '',
        insights: activeSession.insights || '',
        commitments: activeSession.commitments || '',
        supportNeeded: activeSession.supportNeeded || '',
        preSessionNotes: activeSession.preSessionNotes || '',
        postReflection: (user?.role === 'MENTEE'
          ? activeSession.postSessionReflectionMentee
          : activeSession.postSessionReflectionMentor) || '',
      });
    }
  }, [selectedWeek, activeSession]);

  // Reset survey when week changes
  useEffect(() => {
    setSurveySubmitted(false);
    setSurveyText('');
    setSurveyRating(5);
  }, [selectedWeek]);

  const handleSubmitSurvey = async () => {
    setSubmittingSurvey(true);
    try {
      const res = await fetch(`/api/pair/${pairId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: selectedWeek,
          growthRating: surveyRating,
          feedbackText: surveyText,
        }),
      });
      if (res.ok) {
        setSurveySubmitted(true);
        setSurveyText('');
      } else {
        alert('Failed to submit survey.');
      }
    } catch (e) {
      alert('Network error.');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      const res = await fetch(`/api/pair/${pairId}/goals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedGoals: goalsInput }),
      });
      if (res.ok) {
        alert('Goals saved successfully!');
        await fetchSpaceData();
      }
    } catch (e) {
      alert('Failed to save goals.');
    }
  };

  const handleSaveAgenda = async () => {
    if (!activeSession) return;
    setSavingAgenda(true);
    try {
      const res = await fetch(`/api/pair/${pairId}/session/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussionPoints: customAgendaText,
        }),
      });

      if (res.ok) {
        setIsEditingAgenda(false);
        await fetchSpaceData();
      } else {
        alert('Failed to save agenda.');
      }
    } catch (e) {
      alert('Network error while saving agenda.');
    } finally {
      setSavingAgenda(false);
    }
  };

  const handleSaveSessionNotes = async () => {
    if (!activeSession) return;
    setSavingNotes(true);
    try {
      const payload: any = {
        discussionPoints: notesInput.discussionPoints,
        insights: notesInput.insights,
        commitments: notesInput.commitments,
        supportNeeded: notesInput.supportNeeded,
        preSessionNotes: notesInput.preSessionNotes,
      };

      if (user?.role === 'MENTEE') {
        payload.postSessionReflectionMentee = notesInput.postReflection;
      } else {
        payload.postSessionReflectionMentor = notesInput.postReflection;
      }

      const res = await fetch(`/api/pair/${pairId}/session/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchSpaceData();
        alert('Session notes saved!');
      }
    } catch (e) {
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const [isScheduling, setIsScheduling] = useState(false);
  const [customMeetingLink, setCustomMeetingLink] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleScheduleSession = async () => {
    if (!activeSession || !scheduleDate) return;
    setIsScheduling(true);
    try {
      const res = await fetch(`/api/pair/${pairId}/session/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledTime: scheduleDate,
          googleMeetLink: customMeetingLink.trim() || undefined,
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setScheduleDate('');
        setCustomMeetingLink('');
        setIsRescheduling(false);
        await fetchSpaceData();
      } else {
        alert('Failed to schedule session: ' + (resData.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Network error while scheduling session: ' + (e?.message || ''));
    } finally {
      setIsScheduling(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/pair/${pairId}/session/${activeSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        await fetchSpaceData();
      }
    } catch (e) {
      alert('Failed to update status.');
    }
  };

  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle || !actionDueDate || !actionAssignee) return;

    try {
      const res = await fetch(`/api/pair/${pairId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession?.id,
          employeeCode: actionAssignee,
          title: actionTitle,
          description: actionDesc,
          dueDate: actionDueDate,
        }),
      });

      if (res.ok) {
        setActionTitle('');
        setActionDesc('');
        setActionDueDate('');
        setActionAssignee('');
        await fetchSpaceData();
      }
    } catch (e) {
      alert('Failed to create action item.');
    }
  };

  const handleToggleActionStatus = async (itemId: string, currentStatus: string) => {
    const status = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await fetch(`/api/pair/${pairId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionItemId: itemId, status }),
      });
      if (res.ok) {
        await fetchSpaceData();
      }
    } catch (e) {
      alert('Failed to toggle status.');
    }
  };

  const handleAddPrivateNote = async () => {
    if (!privateNoteInput.trim()) return;
    try {
      const res = await fetch(`/api/pair/${pairId}/privatenote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: privateNoteInput }),
      });
      if (res.ok) {
        setPrivateNoteInput('');
        await fetchSpaceData();
      }
    } catch (e) {
      alert('Failed to save private note.');
    }
  };

  const handleSendAiMessage = async (textToSend?: string) => {
    const msg = textToSend || aiMessage;
    if (!msg.trim()) return;

    const updatedChat = [...aiChat, { sender: 'user' as const, text: msg }];
    setAiChat(updatedChat);
    setAiMessage('');
    setAiLoading(true);

    try {
      const res = await fetch(`/api/pair/${pairId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          weekNumber: selectedWeek,
        }),
      });
      const responseData = await res.json();
      if (res.ok) {
        setAiChat([...updatedChat, { sender: 'ai', text: responseData.reply }]);
      } else {
        setAiChat([...updatedChat, { sender: 'ai', text: `Error: ${responseData.error || 'API failed'}` }]);
      }
    } catch (e) {
      setAiChat([...updatedChat, { sender: 'ai', text: 'Network connection failed.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || spaceLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Entering mentoring space...</p>
      </div>
    );
  }

  const isMeMentee = data?.pair?.menteeCode === user?.employeeCode;
  const partnerName = isMeMentee ? data?.pair?.mentor?.name : data?.pair?.mentee?.name;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Space Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 border rounded hover:bg-slate-50 text-slate-600 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Mentoring Space
              <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                {data?.pair?.cohort?.name}
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Pairing: <strong className="text-slate-600">{user?.name}</strong> and <strong className="text-slate-600">{partnerName}</strong>
            </p>
          </div>
        </div>
        <div>
          <a
            href={`/api/pair/${pairId}/export?print=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF Summary
          </a>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-69px)]">
        
        {/* COL 1: 12-Week Sidebar Journey Tracker (cols-3) */}
        <aside className="lg:col-span-3 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Journey Roadmap
            </h3>
            <div className="space-y-1">
              {WEEK_THEMES.map((theme) => {
                const isSelected = selectedWeek === theme.week;
                const dbSession = data?.pair?.sessions?.find((s: any) => s.weekNumber === theme.week);
                const isCompleted = dbSession?.status === 'COMPLETED';

                return (
                  <button
                    key={theme.week}
                    onClick={() => setSelectedWeek(theme.week)}
                    className={`w-full text-left px-3 py-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                        : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="block font-bold text-[10px] uppercase opacity-70">
                        Week {theme.week}
                      </span>
                      <span className="block font-semibold truncate">{theme.title}</span>
                    </div>
                    {isCompleted ? (
                      <CheckCircle className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-green-500'}`} />
                    ) : (
                      <Clock className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* COL 2: Main Workspace Component (cols-6) */}
        <main className="lg:col-span-6 overflow-y-auto p-6 space-y-6">
          {/* Active Theme & Mentor-Editable Agenda Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Selected Session Theme &bull; Week {selectedWeek}
                </span>
                <h2 className="text-lg font-bold text-slate-800">
                  Week {selectedWeek}: {WEEK_THEMES[selectedWeek].title}
                </h2>
              </div>
              
              {/* Edit Agenda button for Mentors / Admin */}
              {(user?.role === 'ADMIN' || user?.role === 'MENTOR' || user?.employeeCode === data?.pair?.mentorCode) && !isEditingAgenda && (
                <button
                  onClick={() => {
                    setCustomAgendaText(activeSession?.discussionPoints || `• Review ${WEEK_THEMES[selectedWeek].title} objectives\n• Discuss operational challenges and key learnings\n• Agree on action commitments for next week`);
                    setIsEditingAgenda(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✎ Edit Meeting Agenda</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {WEEK_THEMES[selectedWeek].objectives}
            </p>

            {/* If Mentor is Editing the Agenda */}
            {isEditingAgenda && (
              <div className="mt-3 p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Customize Meeting Agenda (Reflects automatically on Mentee's screen)
                  </span>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Mentor Editing Mode
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Write the customized discussion topics, specific plant questions, or focus points you want the mentee to prepare for this week.
                </p>
                <textarea
                  rows={4}
                  value={customAgendaText}
                  onChange={(e) => setCustomAgendaText(e.target.value)}
                  placeholder="e.g. • Review equipment vibration logs\n• Discuss root cause analysis on Line 2\n• Set milestone targets for next sprint"
                  className="w-full p-3 border border-indigo-300 rounded-lg text-xs bg-white text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAgenda(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAgenda}
                    disabled={savingAgenda}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{savingAgenda ? 'Saving...' : 'Save & Sync Agenda to Mentee'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Display Configured Agenda (Read-only for Mentee, with highlight) */}
            {!isEditingAgenda && (
              <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Meeting Agenda &amp; Discussion Focus
                  </span>
                  {activeSession?.discussionPoints ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ✓ Customized by Mentor
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Default Framework Focus
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-700 whitespace-pre-line font-normal leading-relaxed pt-1">
                  {activeSession?.discussionPoints || (
                    <span className="text-slate-500 italic">
                      {WEEK_THEMES[selectedWeek].objectives}
                    </span>
                  )}
                </div>
                {isMeMentee && (
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/60 mt-2">
                    💡 This agenda was configured by your mentor ({partnerName}). Use it to guide your conversation and schedule your 1:1 below.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Survey Card */}
          {(selectedWeek === 6 || selectedWeek === 12) && (
            <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-yellow-600" />
                <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider">
                  {selectedWeek === 6 ? 'Mid-Point Pulse Check' : 'End-of-Cohort Close-out Feedback'}
                </h3>
              </div>
              {surveySubmitted ? (
                <p className="text-xs text-green-700 font-bold bg-green-50 p-3 rounded-lg border border-green-200">
                  Thank you! Your survey feedback has been logged.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Please submit your progress feedback. This is used by HR/L&D to track cohort health and program success.
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-semibold text-slate-700">Self-rated Growth (1-5):</label>
                    <select
                      value={surveyRating}
                      onChange={(e) => setSurveyRating(Number(e.target.value))}
                      className="px-2 py-1 border rounded text-xs bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="5">5 - Excellent Growth</option>
                      <option value="4">4 - Good Progress</option>
                      <option value="3">3 - Moderately Stable</option>
                      <option value="2">2 - Minor Impediments</option>
                      <option value="1">1 - Major Issues / Friction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Qualitative Feedback</label>
                    <textarea
                      rows={2}
                      value={surveyText}
                      onChange={(e) => setSurveyText(e.target.value)}
                      placeholder="Share details on goal progression or support needed..."
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitSurvey}
                      disabled={submittingSurvey}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                      {submittingSurvey ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Scheduling & Live Meeting Link Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="h-4 w-4 text-indigo-600" />
                1:1 Session Schedule &amp; Video Room
              </h3>
              {activeSession?.status === 'COMPLETED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ Completed
                </span>
              )}
            </div>

            {activeSession?.scheduledTime && !isRescheduling ? (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-xl space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                      Confirmed Meeting Schedule
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                      📅 {new Date(activeSession.scheduledTime).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })} at {new Date(activeSession.scheduledTime).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <span className="text-[11px] text-slate-300">
                      Participants: {user?.name} &bull; {partnerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setScheduleDate(new Date(activeSession.scheduledTime).toISOString().slice(0, 16));
                        setCustomMeetingLink(activeSession.googleMeetLink || '');
                        setIsRescheduling(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition"
                    >
                      ✎ Reschedule
                    </button>
                    {activeSession.status !== 'COMPLETED' && (
                      <button
                        onClick={handleMarkCompleted}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition shadow"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Video Meeting Link & Calendar Action */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
                  {(() => {
                    const cleanId = (pairId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
                    const validVideoUrl = (!activeSession.googleMeetLink || activeSession.googleMeetLink.includes('ksb-meet'))
                      ? `https://meet.jit.si/Margdarshan-${cleanId}-Week${selectedWeek}`
                      : activeSession.googleMeetLink;

                    return (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <a
                          href={validVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-md shadow-indigo-900/50"
                        >
                          <Video className="h-4 w-4 text-white" />
                          <span>Join 1:1 Live Video Room &rarr;</span>
                        </a>

                        <a
                          href="https://meet.google.com/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs px-3 py-2 rounded-xl font-medium flex items-center gap-1.5 transition"
                          title="Open Google Meet to start an official Google call"
                        >
                          <Video className="h-3.5 w-3.5 text-amber-300" />
                          <span>Google Meet (New Room)</span>
                        </a>
                      </div>
                    );
                  })()}

                  {/* Google Calendar Link */}
                  {(() => {
                    const cleanId = (pairId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
                    const validVideoUrl = (!activeSession.googleMeetLink || activeSession.googleMeetLink.includes('ksb-meet'))
                      ? `https://meet.jit.si/Margdarshan-${cleanId}-Week${selectedWeek}`
                      : activeSession.googleMeetLink;
                    const start = new Date(activeSession.scheduledTime);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);
                    const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
                    const title = encodeURIComponent(`Margdarshan Mentoring: Week ${selectedWeek} - ${WEEK_THEMES[selectedWeek].title} (${partnerName})`);
                    const details = encodeURIComponent(`Margdarshan 1:1 Mentoring Session (Week ${selectedWeek}: ${WEEK_THEMES[selectedWeek].title})\n\nAgenda:\n${activeSession.discussionPoints || WEEK_THEMES[selectedWeek].objectives}\n\nVideo Link:\n${validVideoUrl}`);
                    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTime(start)}/${formatTime(end)}&details=${details}&location=${encodeURIComponent(validVideoUrl)}`;

                    return (
                      <a
                        href={gcalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs px-3.5 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition"
                      >
                        <Calendar className="h-3.5 w-3.5 text-indigo-300" />
                        <span>Add to Calendar</span>
                      </a>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs text-slate-600">
                  {isRescheduling
                    ? 'Select a new date and time to reschedule this 1:1 session:'
                    : 'Select a proposed date and time for your 1:1 mentoring session:'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Session Date &amp; Time *</label>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Custom Meeting URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. Google Meet, MS Teams, or Zoom link..."
                      value={customMeetingLink}
                      onChange={(e) => setCustomMeetingLink(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {isRescheduling && (
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-semibold hover:bg-white transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleScheduleSession}
                    disabled={!scheduleDate || isScheduling}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isScheduling ? 'Scheduling...' : (isRescheduling ? 'Confirm Reschedule' : 'Schedule 1:1 Session')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Goals co-creation (only visible on Week 0 explicitly, or as collapsible card) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Bookmark className="h-4 w-4 text-slate-400" />
              Shared Mentoring Goals (Co-created)
            </h3>
            <textarea
              rows={3}
              value={goalsInput}
              onChange={(e) => setGoalsInput(e.target.value)}
              placeholder="e.g. 1. Complete system design fundamentals. 2. Establish quarterly goals strategy."
              className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none placeholder-slate-400"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveGoals}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs px-4 py-1.5 rounded-lg font-semibold transition-all"
              >
                Save Shared Goals
              </button>
            </div>
          </div>

          {/* Sub-tabs workspace (Notes, Actions, Private, Resources) */}
          <div className="space-y-4">
            <div className="flex border-b text-xs font-semibold text-slate-500">
              <button
                onClick={() => setActiveTab('NOTES')}
                className={`pb-2 px-4 transition-all ${
                  activeTab === 'NOTES' ? 'text-slate-900 border-b-2 border-slate-900' : 'hover:text-slate-700'
                }`}
              >
                Session Notes
              </button>
              <button
                onClick={() => setActiveTab('ACTIONS')}
                className={`pb-2 px-4 transition-all ${
                  activeTab === 'ACTIONS' ? 'text-slate-900 border-b-2 border-slate-900' : 'hover:text-slate-700'
                }`}
              >
                Action Items
              </button>
              <button
                onClick={() => setActiveTab('PRIVATE')}
                className={`pb-2 px-4 transition-all ${
                  activeTab === 'PRIVATE' ? 'text-slate-900 border-b-2 border-slate-900' : 'hover:text-slate-700'
                }`}
              >
                Private Notebook
              </button>
            </div>

            {/* TAB CONTENT: Notes */}
            {activeTab === 'NOTES' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pre-Session Notes & Agenda (What do we want to discuss?)
                    </label>
                    <textarea
                      rows={2}
                      value={notesInput.preSessionNotes}
                      onChange={(e) => setNotesInput({ ...notesInput, preSessionNotes: e.target.value })}
                      placeholder="Mentee writes agenda details here..."
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Discussion Points</label>
                      <textarea
                        rows={3}
                        value={notesInput.discussionPoints}
                        onChange={(e) => setNotesInput({ ...notesInput, discussionPoints: e.target.value })}
                        placeholder="Bullet down core conversation details..."
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Key Insights & Takeaways</label>
                      <textarea
                        rows={3}
                        value={notesInput.insights}
                        onChange={(e) => setNotesInput({ ...notesInput, insights: e.target.value })}
                        placeholder="What lessons or ideas surfaced?"
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Action commitments</label>
                      <textarea
                        rows={3}
                        value={notesInput.commitments}
                        onChange={(e) => setNotesInput({ ...notesInput, commitments: e.target.value })}
                        placeholder="What tasks did we agree on?"
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Support Needed from Mentor</label>
                      <textarea
                        rows={3}
                        value={notesInput.supportNeeded}
                        onChange={(e) => setNotesInput({ ...notesInput, supportNeeded: e.target.value })}
                        placeholder="What introductions or resources can help?"
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Post-Session Reflection (Visible only to you)
                    </label>
                    <textarea
                      rows={2}
                      value={notesInput.postReflection}
                      onChange={(e) => setNotesInput({ ...notesInput, postReflection: e.target.value })}
                      placeholder="Write your honest, private reflection about this session..."
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t pt-4">
                  <button
                    onClick={handleSaveSessionNotes}
                    disabled={savingNotes}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm"
                  >
                    {savingNotes ? 'Saving Notes...' : 'Save Session Notes'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Actions */}
            {activeTab === 'ACTIONS' && (
              <div className="space-y-4">
                {/* Create action form */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                    Add Commitment for this Session
                  </h4>
                  <form onSubmit={handleAddActionItem} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Action Title"
                        value={actionTitle}
                        onChange={(e) => setActionTitle(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-xs bg-slate-50 w-full focus:outline-none"
                        required
                      />
                      <select
                        value={actionAssignee}
                        onChange={(e) => setActionAssignee(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-xs bg-slate-50 w-full focus:outline-none text-slate-600 font-medium"
                        required
                      >
                        <option value="">Assign To...</option>
                        <option value={data?.pair?.menteeCode}>{data?.pair?.mentee?.name} (Mentee)</option>
                        <option value={data?.pair?.mentorCode}>{data?.pair?.mentor?.name} (Mentor)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Short description (optional)"
                        value={actionDesc}
                        onChange={(e) => setActionDesc(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-xs bg-slate-50 w-full focus:outline-none"
                      />
                      <input
                        type="date"
                        value={actionDueDate}
                        onChange={(e) => setActionDueDate(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-xs bg-slate-50 w-full focus:outline-none text-slate-600"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Task
                      </button>
                    </div>
                  </form>
                </div>

                {/* Actions checklist */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-1">
                    Outstanding Session Actions
                  </h4>
                  {data?.actionItems?.length === 0 ? (
                    <p className="text-slate-400 text-xs py-4 text-center">No actions for this session yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {data.actionItems.map((act: any) => (
                        <div key={act.id} className="py-2.5 flex justify-between items-center">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={act.status === 'COMPLETED'}
                              onChange={() => handleToggleActionStatus(act.id, act.status)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                            />
                            <div>
                              <p className={`text-xs font-semibold text-slate-800 ${act.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}`}>
                                {act.title}
                              </p>
                              <p className="text-[10px] text-slate-400">Assigned: {act.assignee.name}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 border px-1.5 py-0.5 rounded">
                            Due: {new Date(act.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Private Notebook */}
            {activeTab === 'PRIVATE' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Eye className="h-4 w-4 text-slate-400" />
                    My Private Log (Confidential - Visible ONLY to me)
                  </label>
                  <textarea
                    rows={4}
                    value={privateNoteInput}
                    onChange={(e) => setPrivateNoteInput(e.target.value)}
                    placeholder="Reflections, feedback phrasing notes, personal development benchmarks..."
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPrivateNote}
                      disabled={!privateNoteInput.trim()}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                    >
                      Save Private Entry
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Past Private Entries</h4>
                  {data?.privateNotes?.length === 0 ? (
                    <p className="text-slate-400 text-xs py-4 text-center">No private log entries yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data.privateNotes.map((pn: any) => (
                        <div key={pn.id} className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-700">
                          <p className="font-bold text-[9px] text-slate-400 mb-1">
                            {new Date(pn.createdAt).toLocaleString()}
                          </p>
                          <p>{pn.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* COL 3: AI Co-Pilot Panel (cols-3) */}
        <aside className="lg:col-span-3 bg-slate-900 border-l border-slate-800 flex flex-col justify-between overflow-hidden">
          {/* AI Panel Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="text-slate-100 font-bold text-xs flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              AI Co-Pilot
            </span>
            <span className="text-[9px] text-yellow-500 font-semibold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
              Role-Aware Context
            </span>
          </div>

          {/* Chat message content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {aiChat.map((chat, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                    chat.sender === 'user'
                      ? 'bg-slate-800 text-slate-100 rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-tl-none'
                  }`}
                >
                  {chat.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="text-[10px] text-slate-500 font-medium animate-pulse flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" /> AI co-pilot thinking...
              </div>
            )}
          </div>

          {/* Quick recommendations helpers (dynamic based on role) */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Prompts</p>
            {user?.role === 'MENTEE' ? (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSendAiMessage('Help me prepare questions for this week\'s theme.')}
                  disabled={aiLoading}
                  className="text-left bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded transition-all truncate font-medium"
                >
                  Draft preparation questions
                </button>
                <button
                  onClick={() => handleSendAiMessage('Provide advice on how my S-style DISC communicates with my counterpart.')}
                  disabled={aiLoading}
                  className="text-left bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded transition-all truncate font-medium"
                >
                  Analyze DISC style dynamic
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSendAiMessage('Give me coaching prompts for this week\'s theme using the GROW model.')}
                  disabled={aiLoading}
                  className="text-left bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded transition-all truncate font-medium"
                >
                  Get GROW model coaching questions
                </button>
                <button
                  onClick={() => handleSendAiMessage('Suggest ways to check on progress of our current co-created goals.')}
                  disabled={aiLoading}
                  className="text-left bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2.5 py-1.5 rounded transition-all truncate font-medium"
                >
                  Diagnose goal progress
                </button>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
            <input
              type="text"
              placeholder="Ask for advice..."
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
              disabled={aiLoading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-600 placeholder-slate-500"
            />
            <button
              onClick={() => handleSendAiMessage()}
              disabled={aiLoading || !aiMessage.trim()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 p-2 rounded-lg transition-all shadow disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}
