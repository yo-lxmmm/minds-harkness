
import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Users, 
  MessageSquare, 
  Zap, 
  Ghost, 
  Timer, 
  Target,
  Brain,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { AnalysisReport as IAnalysisReport, Participant } from '../types';

interface Props {
  report: IAnalysisReport;
  participants: Participant[];
}

const AnalysisReport: React.FC<Props> = ({ report, participants }) => {
  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.fullName || 'Unknown';

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-24"
    >
      {/* Discussion Landscape - Hero Bento */}
      <motion.section variants={item} className="md:col-span-8 glass-card p-10 rounded-4xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
            <Target size={24} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">Discussion Landscape</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">The Core Inquiry (What)</h3>
            <p className="text-slate-600 leading-relaxed font-medium">{report.summary.what}</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">The Driving Motivation (Why)</h3>
            <p className="text-slate-600 leading-relaxed font-medium">{report.summary.why}</p>
          </div>
        </div>
      </motion.section>

      {/* Star Focus - Small Bento */}
      <motion.section variants={item} className="md:col-span-4 bg-slate-900 p-10 rounded-4xl text-white shadow-2xl shadow-slate-200">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
          <Sparkles size={24} className="text-white" />
        </div>
        <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-4">The Star Focus</h3>
        <p className="text-2xl font-display font-black leading-tight">{report.summary.starConcept}</p>
      </motion.section>

      {/* Participant Profiles - Full Width Grid */}
      <motion.section variants={item} className="md:col-span-12">
        <div className="flex items-center gap-4 mb-8 px-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Users size={20} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Participant Profiles</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {report.profiles.map((profile) => (
            <div key={profile.participantId} className="glass-card p-8 rounded-3xl hover:border-slate-300 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900 transition-colors">
                  <Brain size={24} />
                </div>
                <span className="text-[9px] font-black px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-widest">
                  {profile.role}
                </span>
              </div>
              
              <h3 className="font-display font-black text-xl text-slate-900 mb-2">{getParticipantName(profile.participantId)}</h3>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {profile.sixHats.map(hat => (
                  <span key={hat} className="text-[9px] bg-slate-100 text-slate-900 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                    {hat}
                  </span>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  Allied with: <span className="text-slate-700">{getParticipantName(profile.primaryInteractedWith).split(' ')[0]}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Insights - Mid Bento */}
      <motion.section variants={item} className="md:col-span-7 glass-card p-10 rounded-4xl bg-slate-900 text-white">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-amber-400 text-slate-900 rounded-2xl flex items-center justify-center">
            <Lightbulb size={24} />
          </div>
          <h2 className="text-2xl font-black">Key Insights</h2>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {report.keyInsights.map((insight, i) => (
            <div key={i} className="flex gap-6 group">
              <span className="text-amber-400 font-display font-black text-2xl opacity-40 group-hover:opacity-100 transition-opacity">0{i+1}</span>
              <p className="text-slate-300 text-sm leading-relaxed font-medium pt-1">{insight}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Unfinished Threads - Mid Bento */}
      <motion.section variants={item} className="md:col-span-5 glass-card p-10 rounded-4xl border-rose-100 bg-rose-50/30">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Unfinished Threads</h2>
        </div>
        <div className="space-y-4">
          {report.unfinishedThreads.map((thread, i) => (
            <div key={i} className="p-5 bg-white rounded-2xl border border-rose-100 text-sm font-medium text-rose-900 shadow-sm flex gap-4">
              <Zap size={18} className="text-rose-400 shrink-0" />
              {thread}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Negative Space - Wide Bento */}
      <motion.section variants={item} className="md:col-span-8 glass-card p-10 rounded-4xl bg-slate-50/50 border-slate-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
            <Ghost size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Negative Space Analysis</h2>
        </div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6 italic">"The silence between the notes"</p>
        <p className="text-slate-700 leading-relaxed font-medium text-lg">{report.negativeSpace}</p>
      </motion.section>

      {/* Silent Moments - Small Bento */}
      <motion.section variants={item} className="md:col-span-4 glass-card p-10 rounded-4xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <Timer size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Moments of Silence</h2>
        </div>
        <ul className="space-y-4">
          {report.silentMoments.map((moment, i) => (
            <li key={i} className="text-sm font-medium text-slate-500 flex items-start gap-4 group">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-2 group-hover:scale-150 transition-transform" />
              {moment}
            </li>
          ))}
        </ul>
      </motion.section>
    </motion.div>
  );
};

export default AnalysisReport;
