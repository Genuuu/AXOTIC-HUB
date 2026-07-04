import React, { useState, useEffect } from "react";
import { db, createGlobalNotification, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { 
  Lightbulb, 
  ThumbsUp, 
  Trash2, 
  Plus, 
  Search, 
  CheckCircle, 
  Sparkles, 
  Clock, 
  User, 
  ExternalLink,
  Tag,
  Filter,
  Flame,
  ArrowRight,
  MessageCircle,
  Send,
  Edit
} from "lucide-react";
import { UserProfile, Idea, IdeaStatus, Project, IdeaComment } from "../types";

// Safe helpers for Firestore Timestamps and local strings
const formatDate = (val: any) => {
  if (!val) return "Recently";
  // If it is a Firestore Timestamp object with .toDate()
  if (typeof val.toDate === "function") {
    return val.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  }
  // If it has seconds (e.g. serialized Firestore Timestamp)
  if (val.seconds !== undefined) {
    return new Date(val.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  }
  // If it is a string or number
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
};

const getTimestampMs = (val: any) => {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

interface IdeasBoardProps {
  currentUser: UserProfile;
  roster: UserProfile[];
  onPromoteToProject: (idea: Idea) => Promise<string>; // Promotes idea and returns the new project ID
}

export default function IdeasBoard({ currentUser, roster, onPromoteToProject }: IdeasBoardProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"votes" | "latest">("votes");
  
  // Custom interactive state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStatus, setNewStatus] = useState<IdeaStatus>("Pending");
  const [submitting, setSubmitting] = useState(false);

  // Edit Idea State
  const [ideaToEdit, setIdeaToEdit] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<IdeaStatus>("Pending");
  const [updating, setUpdating] = useState(false);
  
  // Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});

  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);
  const [ideaToPromote, setIdeaToPromote] = useState<Idea | null>(null);

  // Firestore or Sandbox state Sync
  useEffect(() => {
    if (currentUser.isOfflineMock) {
      // Offline mode support from localStorage
      const syncMockIdeas = () => {
        const local = localStorage.getItem("axotic_mock_ideas");
        if (local) {
          try {
            setIdeas(JSON.parse(local));
          } catch (_) {}
        } else {
          // Prefill default mock ideas
          const defaultIdeas: Idea[] = [
            {
              id: "idea-1",
              title: "Autonomous Mecanum Intake System v2",
              description: "A redesigned front intake module utilizing highly-compliant silicone rollers coupled to a high-reduction brushless motor to vacuum up gaming elements fast. This will prevent high friction and lower element jamming.",
              createdBy: "mock-bob",
              creatorName: "Bob Axel",
              creatorAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Bob",
              createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
              updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
              votes: 4,
              votedIds: ["mock-sarah", "mock-genu"],
              status: "Discussing"
            },
            {
              id: "idea-2",
              title: "Computer Vision Tag Localization Node",
              description: "Integrating AprilTag visual tracking algorithms onto an onboard coprocessor like Raspberry Pi 5 to estimate millimeters-precise coordinate points relative to obstacles. This will make autonomous routines far more consistent.",
              createdBy: "mock-sarah",
              creatorName: "Sarah Connor",
              creatorAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Sarah",
              createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
              updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
              votes: 6,
              votedIds: ["mock-bob", "mock-genu"],
              status: "Pending"
            },
            {
              id: "idea-3",
              title: "High-Impedance Power Management Shield",
              description: "Custom PCB with high isolation buffers, inline current-shunts, and telemetry modules transmitting battery telemetry to the driver station instantly over serial.",
              createdBy: "mock-genu",
              creatorName: "Genu Kakisara (Lead)",
              creatorAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Genu",
              createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
              updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
              votes: 2,
              votedIds: ["mock-bob"],
              status: "Promoted",
              promotedProjectId: "mock-project-1"
            }
          ];
          localStorage.setItem("axotic_mock_ideas", JSON.stringify(defaultIdeas));
          setIdeas(defaultIdeas);
        }
      };

      syncMockIdeas();
      window.addEventListener("axotic_db_update", syncMockIdeas);
      return () => window.removeEventListener("axotic_db_update", syncMockIdeas);
    }

    // Live mode query stream
    const qIdeas = query(collection(db, "ideas"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qIdeas, (snapshot) => {
      const items: Idea[] = [];
      snapshot.forEach((snapDoc) => {
        items.push({ id: snapDoc.id, ...snapDoc.data() } as Idea);
      });
      setIdeas(items);
    }, (err) => {
      console.error("Failed to fetch ideas real-time.", err instanceof Error ? err.message : String(err));
      handleFirestoreError(err, OperationType.GET, "ideas");
    });

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.isOfflineMock]);

  // Persist local custom ideas if offline
  const saveMockIdeasToStore = (updatedList: Idea[]) => {
    localStorage.setItem("axotic_mock_ideas", JSON.stringify(updatedList));
    setIdeas(updatedList);
    window.dispatchEvent(new Event("axotic_db_update"));
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setSubmitting(true);
    const timestamp = new Date().toISOString();

    const freshIdeaPayload = {
      title: newTitle.trim(),
      description: newDesc.trim(),
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      creatorAvatar: currentUser.avatarUrl,
      createdAt: timestamp,
      updatedAt: timestamp,
      votes: 1,
      votedIds: [currentUser.uid],
      status: newStatus
    };

    try {
      if (currentUser.isOfflineMock) {
        const id = `idea-mock-${Date.now()}`;
        const expandedList = [
          { id, ...freshIdeaPayload },
          ...ideas
        ];
        saveMockIdeasToStore(expandedList);
        createGlobalNotification("idea_created", `New idea proposed: ${freshIdeaPayload.title}`, id, currentUser);
      } else {
        const docRef = await addDoc(collection(db, "ideas"), {
          ...freshIdeaPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        createGlobalNotification("idea_created", `New idea proposed: ${freshIdeaPayload.title}`, docRef.id, currentUser);
      }

      setNewTitle("");
      setNewDesc("");
      setNewStatus("Pending");
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to publish concept", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaToEdit || !editTitle.trim() || !editDesc.trim()) return;

    setUpdating(true);
    const timestamp = new Date().toISOString();

    try {
      if (currentUser.isOfflineMock) {
        const mapped = ideas.map((item) =>
          item.id === ideaToEdit.id
            ? { 
                ...item, 
                title: editTitle.trim(), 
                description: editDesc.trim(), 
                status: editStatus,
                updatedAt: timestamp 
              }
            : item
        );
        saveMockIdeasToStore(mapped);
        createGlobalNotification("idea_created", `Idea edited: ${editTitle.trim()}`, ideaToEdit.id, currentUser);
      } else {
        const docRef = doc(db, "ideas", ideaToEdit.id);
        await updateDoc(docRef, {
          title: editTitle.trim(),
          description: editDesc.trim(),
          status: editStatus,
          updatedAt: serverTimestamp()
        });
        createGlobalNotification("idea_created", `Idea edited: ${editTitle.trim()}`, ideaToEdit.id, currentUser);
      }
      setIdeaToEdit(null);
    } catch (err) {
      console.error("Failed to update concept", err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleVote = async (idea: Idea) => {
    const votedIdsList = idea.votedIds || [];
    const hasVoted = votedIdsList.includes(currentUser.uid);
    let updatedVotedIds: string[];
    let updatedVotes: number;

    if (hasVoted) {
      updatedVotedIds = votedIdsList.filter((id) => id !== currentUser.uid);
      updatedVotes = Math.max(0, (idea.votes || 0) - 1);
    } else {
      updatedVotedIds = [...votedIdsList, currentUser.uid];
      updatedVotes = (idea.votes || 0) + 1;
    }

    try {
      if (currentUser.isOfflineMock) {
        const mapped = ideas.map((item) => 
          item.id === idea.id 
            ? { ...item, votedIds: updatedVotedIds, votes: updatedVotes, updatedAt: new Date().toISOString() } 
            : item
        );
        saveMockIdeasToStore(mapped);
      } else {
        const docRef = doc(db, "ideas", idea.id);
        await updateDoc(docRef, {
          votedIds: updatedVotedIds,
          votes: updatedVotes,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn("Failed to register support upvote", err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirmDeleteIdea = async () => {
    if (!ideaToDelete) return;
    const ideaId = ideaToDelete;
    setIdeaToDelete(null);

    try {
      if (currentUser.isOfflineMock) {
        const filtered = ideas.filter((item) => item.id !== ideaId);
        saveMockIdeasToStore(filtered);
      } else {
        await deleteDoc(doc(db, "ideas", ideaId));
      }
    } catch (err) {
      console.error("Failed to delete concept", err instanceof Error ? err.message : String(err));
    }
  };

  const toggleComments = (ideaId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [ideaId]: !prev[ideaId]
    }));
  };

  const submitComment = async (ideaId: string) => {
    const text = newCommentTexts[ideaId]?.trim();
    if (!text) return;

    const newComment: IdeaComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorAvatar: currentUser.avatarUrl,
      content: text,
      createdAt: new Date().toISOString()
    };

    setNewCommentTexts((prev) => ({ ...prev, [ideaId]: "" }));

    try {
      const ideaTitle = ideas.find(i => i.id === ideaId)?.title || "an idea";
      if (currentUser.isOfflineMock) {
        const mapped = ideas.map((item) =>
          item.id === ideaId
            ? { ...item, comments: [...(item.comments || []), newComment], updatedAt: new Date().toISOString() }
            : item
        );
        saveMockIdeasToStore(mapped);
        createGlobalNotification("comment_added", `New comment on: ${ideaTitle}`, ideaId, currentUser);
      } else {
        const docRef = doc(db, "ideas", ideaId);
        await updateDoc(docRef, {
          comments: arrayUnion(newComment),
          updatedAt: serverTimestamp()
        });
        createGlobalNotification("comment_added", `New comment on: ${ideaTitle}`, ideaId, currentUser);
      }
    } catch (err) {
      console.warn("Failed to submit comment", err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirmPromote = async () => {
    if (!ideaToPromote) return;
    const idea = ideaToPromote;
    setIdeaToPromote(null);

    try {
      // 1. Fire upstream parent call to create actual Project
      const newProjectId = await onPromoteToProject(idea);
      
      // 2. Mark this original idea status as "Promoted" linked to that Project 
      if (currentUser.isOfflineMock) {
        const mapped = ideas.map((item) => 
          item.id === idea.id 
            ? { ...item, status: "Promoted" as IdeaStatus, promotedProjectId: newProjectId, updatedAt: new Date().toISOString() } 
            : item
        );
        saveMockIdeasToStore(mapped);
      } else {
        const docRef = doc(db, "ideas", idea.id);
        await updateDoc(docRef, {
          status: "Promoted" as IdeaStatus,
          promotedProjectId: newProjectId,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to promote idea to active build status", err instanceof Error ? err.message : String(err));
    }
  };

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idea.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idea.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || idea.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort ideas
  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    if (sortBy === "votes") {
      return (b.votes || 0) - (a.votes || 0);
    } else {
      const dateA = getTimestampMs(a.createdAt);
      const dateB = getTimestampMs(b.createdAt);
      return dateB - dateA;
    }
  });

  const getStatusBadge = (status: IdeaStatus) => {
    switch (status) {
      case "Pending":
        return <span className="bg-amber-100 text-amber-800 border-amber-200 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded border dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900">{status}</span>;
      case "Discussing":
        return <span className="bg-blue-100 text-blue-800 border-blue-200 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded border dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">{status}</span>;
      case "Promoted":
        return <span className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded border dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">{status}</span>;
    }
  };



  return (
    <div className="space-y-6 text-left">
      {/* Search and Filters Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/65 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left search */}
          <div className="relative flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search concepts, authors, or descriptions..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-hidden font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="size-4" />
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "votes" | "latest")}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold outline-hidden cursor-pointer"
            >
              <option value="votes">Sort by Upvotes (🔥 Popular)</option>
              <option value="latest">Sort by Timeline (Newest first)</option>
            </select>

            {/* Filter status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:text-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold outline-hidden cursor-pointer"
            >
              <option value="All">All Progression Phases</option>
              <option value="Pending">💡 Pending Review</option>
              <option value="Discussing">💬 Actionable Discussion</option>
              <option value="Promoted">🚀 Promoted to Build</option>
            </select>

            {/* Spawn Idea trigger */}
            <button
              type="button"
              id="spawn-idea-trigger-btn"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="size-4" /> Propose Concept
            </button>
          </div>
        </div>
      </div>

      {/* Ideas list display */}
      {sortedIdeas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/65 p-16 text-center shadow-3xs">
          <Lightbulb className="size-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">No ideas proposed in this group</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Bring your engineers to brainstorm, build CAD, develop software paradigms, and spawn custom mechanical solutions right above!
          </p>
          {(searchQuery || statusFilter !== "All") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
              }}
              className="mt-4 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedIdeas.map((idea) => {
            const hasAlreadyVoted = idea.votedIds?.includes(currentUser.uid);
            return (
              <div 
                key={idea.id}
                id={`idea-card-${idea.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/65 overflow-hidden shadow-3xs hover:shadow-2xs transition-all duration-200 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getStatusBadge(idea.status)}
                    </div>
                  </div>

                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white line-clamp-2">
                    {idea.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed whitespace-pre-wrap">
                    {idea.description}
                  </p>
                </div>

                {/* Footer specs / status panel */}
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 mt-auto">
                  
                  {/* Author profile */}
                  <div className="flex items-center gap-2">
                    <img
                      src={idea.creatorAvatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + encodeURIComponent(idea.creatorName || "Anonymous")}
                      alt={idea.creatorName}
                      referrerPolicy="no-referrer"
                      className="size-6.5 rounded-md border border-slate-200 dark:border-slate-700"
                    />
                    <div className="text-left font-sans">
                      <div className="text-[10px] font-bold text-slate-750 dark:text-slate-300 max-w-[120px] truncate">{idea.creatorName}</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">
                        {formatDate(idea.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions (VOTE & PROMOTE) */}
                  <div id="idea-actions" className="flex items-center gap-2">
                    {/* Votes click element */}
                    <button
                      type="button"
                      id={`vote-idea-btn-${idea.id}`}
                      onClick={() => handleVote(idea)}
                      disabled={idea.status === "Promoted"}
                      className={`h-7 px-2.5 rounded-lg text-xs font-extrabold cursor-pointer border flex items-center gap-1.5 transition-all outline-hidden active:scale-95 ${
                        idea.status === "Promoted"
                          ? "bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-650 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                          : hasAlreadyVoted
                          ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900"
                          : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      title={hasAlreadyVoted ? "Retract my upvote support" : "Upvote this design concept"}
                    >
                      <ThumbsUp className={`size-3.5 ${hasAlreadyVoted ? "fill-blue-500 text-blue-600" : ""}`} />
                      <span>{idea.votes}</span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleComments(idea.id)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border flex items-center gap-1.5 transition-all outline-hidden active:scale-95 ${
                        expandedComments[idea.id]
                          ? "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      title="View Discussions"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>{idea.comments?.length || 0}</span>
                    </button>

                    {/* Promoted State Indicator or Promote Action Button */}
                    {idea.status === "Promoted" ? (
                      <span className="h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 text-[10px] font-bold flex items-center gap-1 select-none">
                        <CheckCircle className="size-3.5 text-emerald-500" /> Active Build
                      </span>
                    ) : (
                      currentUser.role === "admin" && (
                        <button
                          type="button"
                          id={`promote-btn-${idea.id}`}
                          onClick={() => setIdeaToPromote(idea)}
                          className="h-7 px-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer transition-all border-none"
                          title="Instantly create an active building project template from this concept blueprint!"
                        >
                          <Sparkles className="size-3" /> Promote
                        </button>
                      )
                    )}

                    {/* Author edit concept action */}
                    {idea.createdBy === currentUser.uid && idea.status !== "Promoted" && (
                      <button
                        type="button"
                        id={`edit-idea-btn-${idea.id}`}
                        onClick={() => {
                          setIdeaToEdit(idea);
                          setEditTitle(idea.title);
                          setEditDesc(idea.description);
                          setEditStatus(idea.status || "Pending");
                        }}
                        className="p-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Edit Concept"
                      >
                        <Edit className="size-3.5" />
                      </button>
                    )}

                    {/* Author delete retraction action */}
                    {(currentUser.role === "admin" || idea.createdBy === currentUser.uid) && (
                      <button
                        type="button"
                        id={`delete-idea-btn-${idea.id}`}
                        onClick={() => setIdeaToDelete(idea.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Retract/Delete Concept"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Expanded Comments Panel */}
                {expandedComments[idea.id] && (
                  <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 p-4 max-h-[300px] overflow-y-auto w-full flex flex-col pointer-events-auto">
                    <div className="space-y-4 flex-1 mb-4">
                      {(!idea.comments || idea.comments.length === 0) ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center w-full">No comments yet. Start the discussion!</p>
                      ) : (
                        idea.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <img
                              src={comment.authorAvatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + encodeURIComponent(comment.authorName)}
                              alt={comment.authorName}
                              referrerPolicy="no-referrer"
                              className="size-5 rounded-md border border-slate-200 dark:border-slate-700 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{comment.authorName}</span>
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">{formatDate(comment.createdAt)}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="relative mt-auto">
                      <input 
                        type="text"
                        placeholder="Add a comment..."
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs outline-hidden dark:text-slate-300 focus:border-blue-500 transition-colors"
                        value={newCommentTexts[idea.id] || ""}
                        onChange={(e) => setNewCommentTexts(prev => ({ ...prev, [idea.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitComment(idea.id);
                        }}
                      />
                      <button
                        onClick={() => submitComment(idea.id)}
                        disabled={!newCommentTexts[idea.id]?.trim()}
                        className="absolute right-1 top-1 p-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 rounded-md transition-colors"
                      >
                        <Send className="size-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE DIALOG MODAL PANEL */}
      {isCreateOpen && (
        <div id="create-idea-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-800">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Lightbulb className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                    Propose Concept
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                    Sparks fly. Contribute your technical blueprint, design, or agenda.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold font-sans cursor-pointer h-6 w-6 flex items-center justify-center rounded-lg bg-slate-105/50 border-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Concept / Robot Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swerve Drive Pathing Engine or Sponsor Pizza Night"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-medium"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Progression Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IdeaStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold cursor-pointer"
                >
                  <option value="Pending">💡 Pending Review</option>
                  <option value="Discussing">💬 Actionable Discussion</option>
                  <option value="Promoted">🚀 Promoted to Build</option>
                </select>
              </div>



              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description & Specifications</label>
                <textarea
                  required
                  rows={4}
                  placeholder="State the objective, potential cost, required hardware modules, and how this accelerates the AXOTIC build stack..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl p-3.5 text-xs outline-hidden font-medium font-sans leading-relaxed resize-none"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-150/50 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? "Publishing..." : "Submit Concept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DIALOG MODAL PANEL */}
      {ideaToEdit && (
        <div id="edit-idea-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-800">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden text-left">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Lightbulb className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                    Edit Proposed Concept
                  </h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                    Revise the title, strategy, mechanical elements, or technical specs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIdeaToEdit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold font-sans cursor-pointer h-6 w-6 flex items-center justify-center rounded-lg bg-slate-105/50 border-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateIdea} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Concept / Robot Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swerve Drive Pathing Engine or Sponsor Pizza Night"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-medium"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Progression Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as IdeaStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl px-3.5 py-2.5 text-xs outline-hidden font-semibold cursor-pointer"
                >
                  <option value="Pending">💡 Pending Review</option>
                  <option value="Discussing">💬 Actionable Discussion</option>
                  <option value="Promoted">🚀 Promoted to Build</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description & Specifications</label>
                <textarea
                  required
                  rows={4}
                  placeholder="State the objective, potential cost, required hardware modules, and how this accelerates the AXOTIC build stack..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:text-white rounded-xl p-3.5 text-xs outline-hidden font-medium font-sans leading-relaxed resize-none"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-150/50 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIdeaToEdit(null)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {updating ? "Saving Changes..." : "Save Concept"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ideaToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setIdeaToDelete(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-2">Retract Concept?</h3>
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete this idea? This action cannot be undone.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIdeaToDelete(null)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteIdea}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm"
              >
                Retract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Confirmation Modal */}
      {ideaToPromote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
            onClick={() => setIdeaToPromote(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-2">Promote Idea</h3>
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Reviewing: "{ideaToPromote.title}". Are you ready to promote this brainwave idea into an active workspace Project card?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIdeaToPromote(null)}
                className="flex-1 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPromote}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-transparent shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="size-3.5" />
                Promote
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
