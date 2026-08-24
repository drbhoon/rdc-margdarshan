'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Compass, ArrowLeft, LogOut, BookOpen } from 'lucide-react';

import { COMPETENCIES, DEVELOPMENTAL_CHALLENGES } from '@/lib/competencies';

const DISC_QUESTIONS = [
  {
    id: 1,
    question: 'How do you typically approach a new task or problem?',
    options: [
      { key: 'D', text: 'Directly and quickly, focusing on immediate results and solutions.' },
      { key: 'I', text: 'Collaboratively and enthusiastically, brainstorming with team members.' },
      { key: 'S', text: 'Methodically and patiently, ensuring stability and team alignment before proceeding.' },
      { key: 'C', text: 'Analytically, gathering all specifications and studying the details first.' },
    ],
  },
  {
    id: 2,
    question: 'Which best describes your communication style in meetings?',
    options: [
      { key: 'D', text: 'Brief, direct, and focused on targets (get-to-the-point).' },
      { key: 'I', text: 'Expressive, energetic, and highly conversational.' },
      { key: 'S', text: 'Quiet, active listener, supportive, and accommodating of others.' },
      { key: 'C', text: 'Precise, objective, and backed by documents or data.' },
    ],
  },
  {
    id: 3,
    question: 'What motivates you the most in a professional environment?',
    options: [
      { key: 'D', text: 'Overcoming obstacles, winning challenges, and having autonomy.' },
      { key: 'I', text: 'Receiving recognition, social approval, and team camaraderie.' },
      { key: 'S', text: 'Working in a stable team with clear guidelines and mutual support.' },
      { key: 'C', text: 'Achieving high standards, quality excellence, and logic-driven organization.' },
    ],
  },
  {
    id: 4,
    question: 'When under stress or tight deadlines, how do you respond?',
    options: [
      { key: 'D', text: 'I become assertive, demanding, and highly focused on output.' },
      { key: 'I', text: 'I talk more, try to keep spirits high, and may become overly optimistic.' },
      { key: 'S', text: 'I slow down to ensure accuracy, keep quiet, and cooperate.' },
      { key: 'C', text: 'I become highly critical, detail-obsessed, and cautious.' },
    ],
  },
  {
    id: 5,
    question: 'What kind of mentoring relationship is most valuable to you?',
    options: [
      { key: 'D', text: 'Action-driven, targeting quick growth and hard targets.' },
      { key: 'I', text: 'Creative, open-ended, filled with dialogue and big-picture ideas.' },
      { key: 'S', text: 'Structured, stable, with empathetic listening and steady feedback.' },
      { key: 'C', text: 'Resource-rich, technical, focused on code quality and standard operating procedures.' },
    ],
  },
];

export default function OnboardingPage() {
  const { user, loading, login, logout, refreshUser } = useAuth();
  const router = useRouter();

  // Step 1: Goals, competencies & challenges. Step 2: DISC. Step 3: Summary
  const [step, setStep] = useState(1);

  // Form Fields
  const [careerGoals, setCareerGoals] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomTopicInput, setShowCustomTopicInput] = useState(false);

  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [customChallenge, setCustomChallenge] = useState('');
  const [showCustomChallengeInput, setShowCustomChallengeInput] = useState(false);

  const [availability, setAvailability] = useState('');
  const [commStyleNotes, setCommStyleNotes] = useState('');
  const [isConsentShared, setIsConsentShared] = useState(true);

  // DISC assessment answers
  const [discAnswers, setDiscAnswers] = useState<Record<number, string>>({});
  const [isDiscLoading, setIsDiscLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      // Pre-fill existing profile data if available
      if (user.careerGoals && !careerGoals) setCareerGoals(user.careerGoals);
      if (user.topics && user.topics.length > 0 && selectedTopics.length === 0) setSelectedTopics(user.topics);
      if (user.challenges && user.challenges.length > 0 && selectedChallenges.length === 0) setSelectedChallenges(user.challenges);
      if (user.availability && !availability) setAvailability(user.availability);
      if (user.commStyleNotes && !commStyleNotes) setCommStyleNotes(user.commStyleNotes);
    }
  }, [user, loading]);

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleChallengeToggle = (challenge: string) => {
    setSelectedChallenges((prev) =>
      prev.includes(challenge) ? prev.filter((c) => c !== challenge) : [...prev, challenge]
    );
  };

  const handleOptionChange = (qId: number, optionKey: string) => {
    setDiscAnswers((prev) => ({ ...prev, [qId]: optionKey }));
  };

  const validateStep1 = () => {
    if (!careerGoals.trim()) {
      setError(
        user?.role === 'MENTEE'
          ? 'Please outline your career goals and what you hope to achieve.'
          : 'Please outline your mentoring philosophy and leadership experience.'
      );
      return false;
    }
    if (selectedTopics.length === 0 && !customTopic.trim()) {
      setError('Please select at least one competency framework area or add a custom one.');
      return false;
    }
    setError('');
    return true;
  };

  const handleGoToStep2 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmitProfile = async () => {
    // Check if DISC questions are all answered
    const unansweredCount = DISC_QUESTIONS.filter((q) => !discAnswers[q.id]).length;
    if (unansweredCount > 0) {
      setError(`Please answer all ${DISC_QUESTIONS.length} assessment questions.`);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // Aggregate topics and challenges including custom write-ins if provided
      const finalTopics = [...selectedTopics];
      if (customTopic.trim() && !finalTopics.includes(customTopic.trim())) {
        finalTopics.push(customTopic.trim());
      }

      const finalChallenges = [...selectedChallenges];
      if (customChallenge.trim() && !finalChallenges.includes(customChallenge.trim())) {
        finalChallenges.push(customChallenge.trim());
      }

      // 1. Submit general profile info
      const profileRes = await fetch('/api/employee/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerGoals,
          topics: finalTopics,
          challenges: finalChallenges,
          availability,
          commStyleNotes,
          isConsentShared,
        }),
      });

      if (!profileRes.ok) {
        throw new Error('Failed to update profile preferences.');
      }

      // 2. Generate DISC style based on answers
      const answersArr = Object.values(discAnswers);
      const discRes = await fetch('/api/disc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersArr }),
      });

      if (!discRes.ok) {
        throw new Error('Failed to generate DISC profile.');
      }

      await refreshUser();
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDiscLabel = (style: string | null | undefined) => {
    if (!style) return '';
    const map: Record<string, string> = {
      D: 'Dominance (Result-oriented, Direct, Strong-willed)',
      I: 'Influence (Collaborative, Outgoing, Persuasive)',
      S: 'Steadiness (Patient, Empathetic, Consistent, Diplomatic)',
      C: 'Compliance (Analytical, Detail-oriented, Precise)',
    };
    if (style.includes('/')) {
      const parts = style.split('/');
      return `Hybrid ${style} Style (${map[parts[0]].split(' ')[0]} / ${map[parts[1]].split(' ')[0]})`;
    }
    return map[style] || style;
  };

  const getDiscAdvice = (style: string | null | undefined) => {
    if (!style) return '';
    if (style.startsWith('D')) {
      return 'You appreciate speed, focus, and directness. In mentoring, set challenging goals and aim for clear outcomes. Focus on actionable feedback and clear project checkpoints.';
    }
    if (style.startsWith('I')) {
      return 'You thrive in creative and conversational spaces. Make sure to structure your 12-week sessions to avoid losing track of concrete action items amidst great brainstorming!';
    }
    if (style.startsWith('S')) {
      return 'You value psychological safety, stability, and empathetic listening. Focus on co-creating a clear boundary contract in Week 0 to protect your energy and build strong trust.';
    }
    if (style.startsWith('C')) {
      return 'You love facts, standards, and rigorous design. Use the shared action item boards and structured note templates to track learning growth with evidence and data.';
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Checking profile status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 transition-all font-semibold text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
            <div
              className="flex items-center space-x-2 cursor-pointer border-l pl-4 border-slate-200"
              onClick={() => router.push('/dashboard')}
            >
              <Compass className="h-6 w-6 text-slate-800" />
              <span className="text-lg font-bold text-slate-900 tracking-tight">Margdarshan</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">Switch Role:</span>
              <select
                value={user?.employeeCode || ''}
                onChange={async (e) => {
                  if (e.target.value) {
                    await login(e.target.value);
                    window.location.href = '/dashboard';
                  }
                }}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                <option value="" disabled>Switch Persona...</option>
                <option value="EMP001">👑 Radhika Sen (Admin)</option>
                <option value="EMP101">👔 Amit Sharma (Mentor)</option>
                <option value="EMP102">👔 Priya Patel (Mentor)</option>
                <option value="EMP201">🌱 Aarav Mehta (Mentee)</option>
                <option value="EMP205">🌱 Vikram Shah (New Mentee)</option>
              </select>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-400 font-medium uppercase">
                {user?.role} • {user?.department}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl w-full mx-auto">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {/* Header Progress Bar */}
          <div className="bg-slate-900 px-6 py-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {step === 1 ? 'Profile & Competency Setup' : step === 2 ? 'DISC Behavioral Assessment' : 'Profile Insights & Summary'}
              </h1>
              <p className="text-slate-400 text-xs mt-1">Margdarshan Mentoring Platform</p>
            </div>
            <div className="text-sm font-semibold bg-slate-800 px-3 py-1 rounded">
              Step {step} of 3
            </div>
          </div>

        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Profile Details */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            <div className="border-b pb-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                  {user?.role === 'MENTEE'
                    ? 'Mentee Profile: Young Engineer Development & Growth'
                    : 'Mentor Profile: Leadership & Coaching Preferences'}
                </h2>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    user?.role === 'MENTEE'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {user?.role === 'MENTEE' ? 'Young Engineer (Mentee)' : 'Leader / Manager (Mentor)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {user?.role === 'MENTEE'
                  ? 'Tell us what technical competencies you want to master, personal challenges you want to navigate, and what guidance you hope to receive.'
                  : 'Tell us about your operational expertise, leadership coaching philosophy, and how you support young engineers.'}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {user?.role === 'MENTEE'
                    ? 'What are your career goals, aspirations, and what support do you hope to gain from your mentor?'
                    : 'What is your mentoring philosophy, coaching style, and leadership experience?'}
                </label>
                <textarea
                  rows={4}
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  placeholder={
                    user?.role === 'MENTEE'
                      ? 'e.g. Master Preventive Maintenance & Asset Care, build self-confidence in technical reviews, navigate plant-floor challenges, and accelerate my career trajectory...'
                      : 'e.g. Guide young engineers through Total Productive Maintenance, instill SARTAJ safety ownership, build cost responsibility, and foster psychological safety...'
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    {user?.role === 'MENTEE'
                      ? 'Competency Framework Focus (Select competencies you want to develop)'
                      : 'Competency Framework Expertise (Select competencies you can coach & guide in)'}
                  </label>
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Operational Pillars
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2.5">
                  {user?.role === 'MENTEE'
                    ? 'Select the operational and engineering competencies where you want mentorship and skill building:'
                    : 'Select the operational and engineering competencies where you have strong experience to guide others:'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {COMPETENCIES.map((comp) => {
                    const isSelected = selectedTopics.includes(comp);
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => handleTopicToggle(comp)}
                        className={`text-left px-4 py-2.5 border rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-slate-800 text-white shadow-sm font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {comp}
                      </button>
                    );
                  })}
                </div>

                {/* Display custom topics added */}
                {selectedTopics.filter((t) => !COMPETENCIES.includes(t as any)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                    <span className="text-[11px] font-semibold text-slate-500">Custom Competencies:</span>
                    {selectedTopics
                      .filter((t) => !COMPETENCIES.includes(t as any))
                      .map((custom) => (
                        <span
                          key={custom}
                          className="inline-flex items-center gap-1 bg-slate-800 text-white text-xs px-2.5 py-1 rounded-md"
                        >
                          {custom}
                          <button
                            type="button"
                            onClick={() => handleTopicToggle(custom)}
                            className="hover:text-red-300 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Something Else / Custom Competency Write-in */}
                <div className="mt-3">
                  {!showCustomTopicInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomTopicInput(true)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all"
                    >
                      + Something Else (Add Custom Technical / Operational Competency)
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center bg-slate-50 p-2.5 border rounded-lg mt-1.5">
                      <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customTopic.trim() && !selectedTopics.includes(customTopic.trim())) {
                              setSelectedTopics([...selectedTopics, customTopic.trim()]);
                              setCustomTopic('');
                              setShowCustomTopicInput(false);
                            }
                          }
                        }}
                        placeholder="e.g. Vibration Analysis, Thermal Imaging, PLC Automation..."
                        className="flex-1 px-3 py-1.5 border rounded text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customTopic.trim() && !selectedTopics.includes(customTopic.trim())) {
                            setSelectedTopics([...selectedTopics, customTopic.trim()]);
                            setCustomTopic('');
                          }
                          setShowCustomTopicInput(false);
                        }}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTopic('');
                          setShowCustomTopicInput(false);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Developmental Challenges Section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    {user?.role === 'MENTEE'
                      ? 'Real-World Growth & Psychological Challenges (Select personal hurdles you want to navigate)'
                      : 'Real-World Growth & Psychological Guidance (Select areas you can support young engineers with)'}
                  </label>
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Personal Mastery
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2.5">
                  {user?.role === 'MENTEE'
                    ? 'Select the human hurdles, interpersonal friction points, or career trajectory topics you want to address:'
                    : 'Select the personal and emotional hurdles where you can provide perspective, coaching, and psychological safety:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEVELOPMENTAL_CHALLENGES.map((challenge) => {
                    const isSelected = selectedChallenges.includes(challenge);
                    return (
                      <button
                        key={challenge}
                        type="button"
                        onClick={() => handleChallengeToggle(challenge)}
                        className={`text-left px-3.5 py-2.5 border rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-sm font-semibold ring-1 ring-amber-500'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{challenge}</span>
                        {isSelected && <span className="text-amber-700 font-bold ml-1.5">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Display custom challenges added */}
                {selectedChallenges.filter((c) => !DEVELOPMENTAL_CHALLENGES.includes(c as any)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                    <span className="text-[11px] font-semibold text-amber-800">Custom Challenges:</span>
                    {selectedChallenges
                      .filter((c) => !DEVELOPMENTAL_CHALLENGES.includes(c as any))
                      .map((custom) => (
                        <span
                          key={custom}
                          className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-1 rounded-md"
                        >
                          {custom}
                          <button
                            type="button"
                            onClick={() => handleChallengeToggle(custom)}
                            className="hover:text-red-600 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Something Else / Custom Challenge Option */}
                <div className="mt-3">
                  {!showCustomChallengeInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomChallengeInput(true)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-all"
                    >
                      + Something Else (Add Custom Personal Challenge / Growth Area)
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center bg-slate-50 p-2.5 border rounded-lg mt-1.5">
                      <input
                        type="text"
                        value={customChallenge}
                        onChange={(e) => setCustomChallenge(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customChallenge.trim() && !selectedChallenges.includes(customChallenge.trim())) {
                              setSelectedChallenges([...selectedChallenges, customChallenge.trim()]);
                              setCustomChallenge('');
                              setShowCustomChallengeInput(false);
                            }
                          }
                        }}
                        placeholder="e.g. Dealing with imposter syndrome during plant audits..."
                        className="flex-1 px-3 py-1.5 border rounded text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customChallenge.trim() && !selectedChallenges.includes(customChallenge.trim())) {
                            setSelectedChallenges([...selectedChallenges, customChallenge.trim()]);
                            setCustomChallenge('');
                          }
                          setShowCustomChallengeInput(false);
                        }}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomChallenge('');
                          setShowCustomChallengeInput(false);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Availability Preferences
                  </label>
                  <input
                    type="text"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    placeholder="e.g. Fridays 3-5 PM, or Wednesdays mornings"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Communication style notes
                  </label>
                  <input
                    type="text"
                    value={commStyleNotes}
                    onChange={(e) => setCommStyleNotes(e.target.value)}
                    placeholder="e.g. Direct feedback, visual, or email first"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-start mt-4">
                <input
                  type="checkbox"
                  id="consent"
                  checked={isConsentShared}
                  onChange={(e) => setIsConsentShared(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                />
                <label htmlFor="consent" className="ml-2 text-sm text-slate-600">
                  <strong>Counterpart Consent:</strong> Share my goals, communication style, and DISC profile details with my matched mentoring counterpart (strongly recommended).
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={handleGoToStep2}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md text-sm"
              >
                Proceed to DISC Assessment →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DISC Profile Generator Assessment */}
        {step === 2 && (
          <div className="p-8 space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">
                Behavioral Style Assessment (DISC)
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                This lightweight behavior assessment simulates our external DISC profile generator API integration to identify your leadership and communication style (Dominance, Influence, Steadiness, or Compliance).
              </p>
            </div>

            <div className="space-y-6 divide-y divide-slate-100">
              {DISC_QUESTIONS.map((q, idx) => (
                <div key={q.id} className={idx > 0 ? 'pt-6' : ''}>
                  <p className="text-sm font-semibold text-slate-800 mb-3">
                    {q.id}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isChecked = discAnswers[q.id] === opt.key;
                      return (
                        <label
                          key={opt.key}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-slate-50 border-slate-600 ring-1 ring-slate-600'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={isChecked}
                            onChange={() => handleOptionChange(q.id, opt.key)}
                            className="mt-1 h-4 w-4 text-slate-800 border-slate-300 focus:ring-slate-500"
                          />
                          <span className="ml-3 text-xs text-slate-700 font-medium">
                            {opt.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitProfile}
                disabled={isSubmitting}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Calculating Profile...' : 'Complete Profile & Assessment'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete & Show Profile Insights */}
        {step === 3 && (
          <div className="p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-green-50 border border-green-200 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-4">
              Profile Completed Successfully!
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Your profile preferences and DISC personality assessment details have been saved.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left max-w-xl mx-auto my-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Identified DISC Style
                </span>
                <p className="text-lg font-bold text-slate-800 mt-1">
                  Style {user?.discStyle}: {getDiscLabel(user?.discStyle)}
                </p>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Growth Style Interpretation
                </span>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {getDiscAdvice(user?.discStyle)}
                </p>
              </div>

              {user?.topics && user.topics.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Primary Competency Pillars
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.topics.map((t) => (
                      <span key={t} className="bg-slate-200 text-slate-800 text-[11px] px-2.5 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user?.challenges && user.challenges.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs uppercase tracking-wider text-amber-700 font-bold">
                    Personal Growth & Mastery Focus
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user.challenges.map((c) => (
                      <span key={c} className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] px-2.5 py-0.5 rounded font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-md"
            >
              Go to My Dashboard
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
