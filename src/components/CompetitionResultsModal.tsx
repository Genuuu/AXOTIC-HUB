import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Plus, Trash2 } from 'lucide-react';
import { Competition, CompetitionResult, UserProfile } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useWorkspaceSettings } from '../useWorkspaceSettings';

interface CompetitionResultsModalProps {
  competition: Competition;
  roster: UserProfile[];
  onClose: () => void;
  currentUser: UserProfile | null;
}

export default function CompetitionResultsModal({ competition, roster, onClose, currentUser }: CompetitionResultsModalProps) {
  const [results, setResults] = useState<CompetitionResult[]>(competition.results || []);
  const [teamPlacement, setTeamPlacement] = useState<string>(competition.teamPlacement || '');
  const [teamMedals, setTeamMedals] = useState<string>(competition.teamMedals || '');
  const [isSaving, setIsSaving] = useState(false);
  

  const handleAddResult = () => {
    setResults([...results, { memberId: '', placement: '' }]);
  };

  const handleRemoveResult = (index: number) => {
    const updated = [...results];
    updated.splice(index, 1);
    setResults(updated);
  };

  const handleChange = (index: number, field: keyof CompetitionResult, value: string) => {
    const updated = [...results];
    updated[index] = { ...updated[index], [field]: value };
    setResults(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Filter out incomplete results
    const validResults = results.filter(r => r.memberId && r.placement);

    if (currentUser?.isOfflineMock) {
      const storedStr = localStorage.getItem("axotic_mock_competitions");
      if (storedStr) {
        const list: Competition[] = JSON.parse(storedStr);
        const compIndex = list.findIndex(c => c.id === competition.id);
        if (compIndex >= 0) {
          list[compIndex].results = validResults;
          list[compIndex].teamPlacement = teamPlacement;
          list[compIndex].teamMedals = teamMedals;
          localStorage.setItem("axotic_mock_competitions", JSON.stringify(list));
          window.dispatchEvent(new Event("axotic_db_update"));
        }
      }
    } else {
      try {
        await updateDoc(doc(db, "competitions", competition.id), {
          results: validResults,
          teamPlacement,
          teamMedals
        });
      } catch (err) {
        console.error("Failed to save results", err);
        alert("Error saving results. Check permissions.");
      }
    }
    
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <Trophy className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">
                Manage Results
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {competition.title}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="space-y-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="size-4 text-blue-500" /> Overall Team Performance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Team Placement / Rank
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Place Overall"
                    value={teamPlacement}
                    onChange={(e) => setTeamPlacement(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Medals / Awards
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Gold, 1 Silver"
                    value={teamMedals}
                    onChange={(e) => setTeamMedals(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Individual Member Results
              </h3>
            {results.map((result, idx) => (
              <div key={idx} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 relative">
                <button 
                  onClick={() => handleRemoveResult(idx)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Member
                    </label>
                    <select
                      value={result.memberId}
                      onChange={(e) => handleChange(idx, 'memberId', e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                    >
                      <option value="">Select a member...</option>
                      {roster.map(m => (
                        <option key={m.uid} value={m.uid}>{m.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Placement
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1st Place, Gold, Participant"
                      value={result.placement}
                      onChange={(e) => handleChange(idx, 'placement', e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Award / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Best Design Award"
                      value={result.award || ''}
                      onChange={(e) => handleChange(idx, 'award', e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={handleAddResult}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="size-4" /> Add Member Result
            </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Results'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
