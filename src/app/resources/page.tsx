'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Compass,
  ArrowLeft,
  Search,
  BookOpen,
  Plus,
  ExternalLink,
  Tag,
  AlertCircle,
  FileText,
} from 'lucide-react';

import { COMPETENCIES } from '@/lib/competencies';

const COMMON_TAGS = [
  ...COMPETENCIES,
  'DISC-D Style',
  'DISC-I Style',
  'DISC-S Style',
  'DISC-C Style',
  'GROW Model Coaching',
];

export default function ResourcesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [resources, setResources] = useState<any[]>([]);
  const [resLoading, setResLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Contribution Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [selectedFormTags, setSelectedFormTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchResources = async () => {
    try {
      setResLoading(true);
      const res = await fetch('/api/resources');
      if (res.ok) {
        const json = await res.json();
        setResources(json.resources);
      } else {
        setError('Failed to fetch resources.');
      }
    } catch (e) {
      setError('Connection failure.');
    } finally {
      setResLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchResources();
    }
  }, [user, loading]);

  const handleTagToggle = (tag: string) => {
    setSelectedFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          url,
          content,
          tags: selectedFormTags,
        }),
      });

      if (res.ok) {
        setTitle('');
        setUrl('');
        setContent('');
        setSelectedFormTags([]);
        setIsFormOpen(false);
        setSuccessMsg(
          user?.role === 'ADMIN'
            ? 'Resource added and approved successfully!'
            : 'Thank you! Resource submitted for HR review.'
        );
        await fetchResources();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit resource.');
      }
    } catch (e) {
      setError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.content && res.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = !selectedTag || res.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (loading || resLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Loading Resource Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 border rounded hover:bg-slate-50 text-slate-600 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center space-x-2">
            <Compass className="h-6 w-6 text-slate-800" />
            <h1 className="text-lg font-bold text-slate-800">Resource Hub</h1>
          </div>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Contribute Material
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow space-y-6">
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {/* Contribution Drawer */}
        {isFormOpen && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-1">
              Contribute Coaching or Study Reference
            </h3>
            <form onSubmit={handleContribute} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master-class on Upward Feedback"
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">External Link URL (Optional)</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Short Content Summary</label>
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Summarize the core coaching utility of this resource..."
                  className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Category Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = selectedFormTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 border rounded-full text-[10px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-slate-800 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-6 py-2 rounded-lg font-bold transition-all shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Material'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Tag Filter Grid */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 w-full max-w-md">
            <Search className="h-4 w-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search resource summaries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs w-full focus:outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t pt-3">
            <button
              onClick={() => setSelectedTag('')}
              className={`px-3 py-1 border rounded-full text-[10px] font-semibold transition-all ${
                !selectedTag ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Categories
            </button>
            {COMMON_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 border rounded-full text-[10px] font-semibold transition-all ${
                  selectedTag === tag ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center text-slate-400 font-medium">
            No resources match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => (
              <div key={res.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-800 text-sm leading-snug">{res.title}</h3>
                    {!res.isApproved && (
                      <span className="bg-yellow-50 text-yellow-700 border border-yellow-100 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">
                        Pending HR Approval
                      </span>
                    )}
                  </div>
                  {res.content && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-4">{res.content}</p>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                  <div className="flex flex-wrap gap-1">
                    {res.tags.map((t: string) => (
                      <span key={t} className="bg-slate-100 border text-slate-600 text-[9px] px-2 py-0.5 rounded font-medium">
                        {t}
                      </span>
                    ))}
                  </div>

                  {res.url && (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      View Resource Material
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
