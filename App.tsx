
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Users, 
  Eye, 
  BarChart3, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2,
  BrainCircuit,
  LayoutDashboard,
  LineChart
} from 'lucide-react';
import { 
  InteractionType, 
  Participant, 
  HarknessAnalysis,
} from './types';
import { analyzeTranscript } from './services/geminiService';
import HarknessMap from './components/HarknessMap';
import AnalysisReport from './components/AnalysisReport';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'SA', initials: 'SA', fullName: 'Speaker A', scannedName: 'Speaker A', isFacilitator: true },
    { id: '2', name: 'SB', initials: 'SB', fullName: 'Speaker B', scannedName: 'Speaker B', isFacilitator: false },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<HarknessAnalysis | null>(null);
  const [step, setStep] = useState<'input' | 'confirm' | 'preview' | 'result'>('input');
  const [cleanedTranscript, setCleanedTranscript] = useState('');
  
  // UI State for Visualization
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<InteractionType>>(new Set(Object.values(InteractionType)));
  const [view, setView] = useState<'map' | 'report'>('map');

  const steps = [
    { id: 'input', label: 'Input', icon: Sparkles },
    { id: 'confirm', label: 'Verify', icon: Users },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'result', label: 'Analysis', icon: BarChart3 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const handleAddParticipant = () => {
    const id = Math.random().toString(36).substr(2, 9);
    setParticipants([...participants, { 
      id, 
      name: 'NS', 
      initials: 'NS', 
      fullName: 'New Speaker', 
      scannedName: 'New Speaker', 
      isFacilitator: false 
    }]);
  };

  const handleUpdateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        // Auto-update initials if fullName is changed
        if (updates.fullName !== undefined) {
          updated.initials = getInitials(updates.fullName);
        }
        return updated;
      }
      return p;
    }));
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const getInitials = (name: string) => {
    return name
      .split(/[\s_-]+/)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  };

  const handleScanParticipants = () => {
    if (!transcript.trim()) return;
    
    // Traditional NLP: Regex to find patterns like "Name:", "[Name]", or "@Name Timestamp" at start of lines
    const nameRegex = /^(?:\[?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\]?|([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)):|^@([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s\d{2}:\d{2}:\d{2}/gm;
    const matches = new Set<string>();
    let match;
    
    while ((match = nameRegex.exec(transcript)) !== null) {
      const name = match[1] || match[2] || match[3];
      if (name) matches.add(name.trim());
    }

    const detectedParticipants: Participant[] = Array.from(matches).map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name: getInitials(name),
      initials: getInitials(name),
      fullName: name,
      scannedName: name,
      isFacilitator: false
    }));

    if (detectedParticipants.length > 0) {
      setParticipants(detectedParticipants);
      setStep('confirm');
    } else {
      alert("No participants detected. Please ensure the transcript follows a 'Name:' format.");
    }
  };

  const handlePrepareTranscript = () => {
    // Transform names to initials and update transcript
    let updated = transcript;
    
    // Collect all strings to replace and their corresponding initials
    // We want to replace both the scanned name and the display name (and display first name)
    const replacements: { pattern: string, replacement: string }[] = [];
    
    participants.forEach(p => {
      const initials = p.initials;
      const firstName = p.fullName.split(' ')[0];
      
      // Source Name (Full)
      replacements.push({ pattern: p.scannedName, replacement: initials });
      
      // Display Name (Full)
      if (p.fullName !== p.scannedName) {
        replacements.push({ pattern: p.fullName, replacement: initials });
      }
      
      // First Name (from Display Name as requested)
      if (firstName.length > 2 && firstName !== initials && firstName !== p.fullName && firstName !== p.scannedName) {
        replacements.push({ pattern: firstName, replacement: initials });
      }
    });

    // Sort replacements by pattern length descending to prevent partial matches
    const sortedReplacements = replacements
      .filter(r => r.pattern.trim().length > 0)
      .sort((a, b) => b.pattern.length - a.pattern.length);

    // Apply replacements
    sortedReplacements.forEach(({ pattern, replacement }) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // 1. Replace speaker labels at start of lines (e.g., Name: or [Name])
      // Using case-insensitive flag 'i' to catch 'jane:' as well as 'Jane:'
      const speakerRegex = new RegExp(`^${escaped}:`, 'gmi');
      updated = updated.replace(speakerRegex, `${replacement}:`);
      
      const bracketRegex = new RegExp(`^\\[${escaped}\\]`, 'gmi');
      updated = updated.replace(bracketRegex, `[${replacement}]`);

      // 2. Replace @Name Timestamp format
      const atMentionRegex = new RegExp(`^@${escaped}(\\s\\d{2}:\\d{2}:\\d{2})`, 'gmi');
      updated = updated.replace(atMentionRegex, `@${replacement}$1`);

      // 3. Replace mentions within the text (with word boundaries)
      // Using case-insensitive flag 'i' to catch 'jane' as well as 'Jane'
      const mentionRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
      updated = updated.replace(mentionRegex, replacement);
    });

    const finalParticipants = participants.map(p => ({ ...p, name: p.initials }));

    setCleanedTranscript(updated);
    setParticipants(finalParticipants);
    setStep('preview');
  };

  const handleFinalAnalyze = async () => {
    setIsProcessing(true);
    try {
      const result = await analyzeTranscript(cleanedTranscript, participants);
      setAnalysis(result);
      setPlaybackIndex(result.interactions.length - 1);
      setStep('result');
    } catch (err) {
      console.error(err);
      alert('Failed to analyze transcript. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    try {
      const result = await analyzeTranscript(transcript, participants);
      setAnalysis(result);
      setPlaybackIndex(result.interactions.length - 1);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze transcript. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFilter = (type: InteractionType) => {
    const next = new Set(activeFilters);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setActiveFilters(next);
  };

  return (
    <div className="min-h-screen harkness-bg font-sans selection:bg-slate-200 selection:text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200/50 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <BrainCircuit size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black text-slate-900 leading-none">Harkness <span className="text-slate-900">AI</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Creative Studio Edition</p>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="hidden md:flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isPast = steps.findIndex(st => st.id === step) > idx;
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
                    ${isActive ? 'bg-white shadow-sm text-slate-900 scale-105' : isPast ? 'text-emerald-500' : 'text-slate-400'}
                  `}>
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center
                      ${isActive ? 'bg-slate-900 text-white' : isPast ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}
                    `}>
                      {isPast ? <CheckCircle2 size={14} strokeWidth={3} /> : <Icon size={14} strokeWidth={2.5} />}
                    </div>
                    <span className="text-xs font-bold tracking-tight">{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-4 h-px bg-slate-200 mx-1" />
                  )}
                </div>
              );
            })}
          </div>

          {analysis && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setView('map')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutDashboard size={14} />
                Map
              </button>
              <button 
                onClick={() => setView('report')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${view === 'report' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LineChart size={14} />
                Report
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              <div className="lg:col-span-8 space-y-8">
                <div className="glass-card p-10 rounded-4xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">Start your analysis</h2>
                      <p className="text-slate-500 mt-1">Paste your discussion transcript below to begin mapping dynamics.</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                  </div>
                  <textarea 
                    className="w-full h-[500px] p-8 text-slate-700 bg-slate-50/50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all outline-none resize-none font-mono text-sm leading-relaxed"
                    placeholder="Speaker A: What do we think about the project timeline?&#10;Speaker B: I think it's too aggressive given our resources."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="glass-card p-10 rounded-4xl sticky top-32">
                  <div className="mb-8">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200">
                      <Users size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Step 1: Scan</h2>
                    <p className="text-slate-500 mt-2 leading-relaxed">We'll automatically detect participants and convert their names to initials for a clean map.</p>
                  </div>

                  <button 
                    disabled={!transcript.trim()}
                    onClick={handleScanParticipants}
                    className="btn-primary w-full flex items-center justify-center gap-3 group"
                  >
                    Scan for Participants
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Supported Formats</h3>
                    <ul className="space-y-3">
                      {['Name: Text', '[Name]: Text', '@Name HH:MM:SS'].map(f => (
                        <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="glass-card p-10 rounded-4xl">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">Verify Participants</h2>
                    <p className="text-slate-500 mt-1">We've detected these speakers. Adjust their details as needed.</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  {participants.map((p) => (
                    <motion.div 
                      layout
                      key={p.id} 
                      className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 transition-colors group"
                    >
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Name in Transcript</label>
                            <input 
                              className="w-full bg-white border border-slate-200 px-3 py-2 text-[11px] font-mono text-slate-600 rounded-xl focus:ring-2 focus:ring-slate-500/20 outline-none"
                              value={p.scannedName}
                              onChange={(e) => handleUpdateParticipant(p.id, { scannedName: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Display Name</label>
                            <input 
                              className="w-full bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 rounded-xl focus:ring-2 focus:ring-slate-500/20 outline-none"
                              value={p.fullName}
                              onChange={(e) => handleUpdateParticipant(p.id, { fullName: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Initials</label>
                        <input 
                          className="w-14 h-14 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center font-display font-black text-slate-900 text-center uppercase focus:ring-4 focus:ring-slate-500/10 outline-none shadow-sm"
                          value={p.initials}
                          maxLength={3}
                          onChange={(e) => handleUpdateParticipant(p.id, { initials: e.target.value.toUpperCase() })}
                        />
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Facilitator</label>
                        <button 
                          onClick={() => handleUpdateParticipant(p.id, { isFacilitator: !p.isFacilitator })}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${p.isFacilitator ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                        >
                          <BrainCircuit size={24} />
                        </button>
                      </div>

                      <button 
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                  
                  <button 
                    onClick={handleAddParticipant}
                    className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Add Missing Participant
                  </button>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('input')}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    Back
                  </button>
                  <button 
                    disabled={isProcessing || participants.length === 0}
                    onClick={handlePrepareTranscript}
                    className="btn-primary flex-[2] flex items-center justify-center gap-2 group"
                  >
                    Next: Preview Cleaned Transcript
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="glass-card p-10 rounded-4xl">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">Preview & Refine</h2>
                    <p className="text-slate-500 mt-1">Review the anonymized transcript. You can make final manual edits here.</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center">
                    <Eye size={24} />
                  </div>
                </div>

                <div className="mb-10">
                  <textarea 
                    className="w-full h-[500px] p-8 text-slate-700 bg-slate-50/50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 transition-all outline-none resize-none font-mono text-sm leading-relaxed"
                    value={cleanedTranscript}
                    onChange={(e) => setCleanedTranscript(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('confirm')}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    Back
                  </button>
                  <button 
                    disabled={isProcessing || !cleanedTranscript.trim()}
                    onClick={handleFinalAnalyze}
                    className="btn-primary flex-[2] flex items-center justify-center gap-3 group"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing Dynamics...
                      </>
                    ) : (
                      <>
                        Generate Harkness Map
                        <Sparkles size={20} className="group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'result' && analysis && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
            >
              {view === 'map' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                  {/* Visualizer Panel */}
                  <div className="lg:col-span-3 space-y-8">
                    <div className="glass-card p-8 rounded-4xl overflow-hidden">
                      <HarknessMap 
                        participants={participants} 
                        interactions={analysis.interactions}
                        playbackIndex={playbackIndex}
                        filters={activeFilters}
                      />
                    </div>
                    
                    {/* Playback Controls */}
                    <div className="glass-card p-8 rounded-4xl flex items-center gap-8">
                      <button 
                        onClick={() => setPlaybackIndex(p => Math.max(0, p - 1))}
                        className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="flex-1 relative py-4">
                        <input 
                          type="range"
                          min="0"
                          max={analysis.interactions.length - 1}
                          value={playbackIndex}
                          onChange={(e) => setPlaybackIndex(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                        />
                      </div>
                      <button 
                        onClick={() => setPlaybackIndex(p => Math.min(analysis.interactions.length - 1, p + 1))}
                        className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <ArrowRight size={20} />
                      </button>
                      <div className="min-w-[80px] text-center">
                        <span className="text-xl font-display font-black text-slate-900">{playbackIndex + 1}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-tighter">/ {analysis.interactions.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filters Sidebar */}
                  <div className="space-y-8">
                    <div className="glass-card p-8 rounded-4xl">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Interaction Types</h3>
                      <div className="space-y-3">
                        {[
                          { type: InteractionType.OPEN_QUESTION, label: 'Open Question', color: 'bg-rose-500' },
                          { type: InteractionType.DIRECT_QUESTION, label: 'Direct Question', color: 'bg-emerald-500' },
                          { type: InteractionType.OPEN_STATEMENT, label: 'Open Statement', color: 'bg-rose-400' },
                          { type: InteractionType.DIRECT_RESPONSE, label: 'Direct Response', color: 'bg-slate-900' },
                          { type: InteractionType.FACILITATOR_META, label: 'Facilitator Input', color: 'bg-amber-500' },
                        ].map(f => (
                          <button 
                            key={f.type}
                            onClick={() => toggleFilter(f.type)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${activeFilters.has(f.type) ? 'bg-white border-slate-100 shadow-sm' : 'opacity-40 border-transparent grayscale'}`}
                          >
                            <div className={`w-3 h-3 rounded-full ${f.color} shadow-lg shadow-${f.color.split('-')[1]}-200`} />
                            <span className="text-sm font-bold text-slate-700">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setAnalysis(null); setStep('input'); setView('map'); }}
                      className="w-full py-4 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={14} />
                      New Analysis
                    </button>
                  </div>
                </div>
              ) : (
                <AnalysisReport report={analysis.report} participants={participants} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
