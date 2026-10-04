import React, { useState, useRef } from "react";
import { db, handleFirestoreError, OperationType, createAdminLog } from "../firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import { UserPlus, Sparkles, CheckCircle2, Calendar, Shield, Mail, Upload, Camera, Trash2, GraduationCap, HardDrive, FileText, Tag, ChevronDown } from "lucide-react";
import { UserProfile, UserRole } from "../types";
import { useWorkspaceSettings } from "../useWorkspaceSettings";
import { ROLE_COLOR_MAP } from "../roleUtils";
import TagInput from "./TagInput";

interface AddMemberProps {
  currentUser: UserProfile;
}

export default function AddMember({ currentUser }: AddMemberProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const { customRoles, divisionTags, specialtyTags } = useWorkspaceSettings(currentUser.isOfflineMock);
  const [selectedRoleId, setSelectedRoleId] = useState("core_engineer");
  const [subTeam, setSubTeam] = useState(divisionTags[0] || "General");
  const [customDivision, setCustomDivision] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to compress and resize photo uploads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Only image files (JPEG, PNG, SVG) are allowed.");
      return;
    }

    setCompressing(true);
    setErrorMsg("");

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 160; // Optimal profile picture dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to highly compact JPEG (saves memory in Firestore/LocalStorage)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setAvatarUrl(dataUrl);
        } else {
          setAvatarUrl(readerEvent.target?.result as string);
        }
        setCompressing(false);
      };
      img.onerror = () => {
        setErrorMsg("Failed to process image file.");
        setCompressing(false);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const newUid = `user-${Date.now()}`;
    // Fallback to stylized dicebear pixel avatar if no upload was selected
    const finalAvatar = avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayName.trim())}`;
    
    const chosenRole = customRoles.find(r => r.id === selectedRoleId);
    const finalClearance: UserRole = chosenRole ? chosenRole.clearance : "member";
    const finalRoleName = chosenRole ? chosenRole.name : "Core Engineer";
    const finalSubTeam = subTeam === "Other" ? (customDivision.trim() || (divisionTags[0] || "General")) : (subTeam || divisionTags[0] || "General");

    const payload: UserProfile = {
      uid: newUid,
      displayName: displayName.trim(),
      email: email.trim().toLowerCase(),
      role: finalClearance,
      customRoleId: chosenRole ? chosenRole.id : undefined,
      customRoleName: finalRoleName,
      specifications: specifications.trim(),
      birthday: birthday || "",
      subTeam: finalSubTeam,
      phoneNumber: phoneNumber.trim(),
      homepageUrl: homepageUrl.trim(),
      avatarUrl: finalAvatar,
      joinedAt: new Date().toISOString(),
      ...(currentUser.isOfflineMock ? { isOfflineMock: true } : {})
    };

    if (currentUser.isOfflineMock) {
      setTimeout(() => {
        const stored = localStorage.getItem("axotic_mock_roster");
        let rosterList: UserProfile[] = [];
        if (stored) {
          try {
            rosterList = JSON.parse(stored);
            if (!Array.isArray(rosterList)) rosterList = [];
          } catch (_) {
            rosterList = [];
          }
        }
        
        rosterList.push(payload);
        localStorage.setItem("axotic_mock_roster", JSON.stringify(rosterList));

        createAdminLog(
          "MEMBER_ONBOARDED",
          `Onboarded new member "${displayName.trim()}" directly to active directory division "${finalSubTeam}" as role "${finalRoleName}" (${finalClearance}).`,
          currentUser
        );

        window.dispatchEvent(new Event("axotic_db_update"));
        setSuccessMsg(`Successfully registered ${displayName.trim()} in local Sandbox! Assigned role: ${finalRoleName} [${finalSubTeam}]`);
        resetForm();
        setLoading(false);
      }, 600);
      return;
    }

    try {
      const userRef = doc(db, "users", newUid);
      await setDoc(userRef, payload);

      // Write outbound mail trigger doc to Firestore /mail collection compatible with Firebase Trigger Email extension
      try {
        const mailRef = doc(collection(db, "mail"));
        await setDoc(mailRef, {
          to: email.trim().toLowerCase(),
          message: {
            subject: "Welcome to Team AXOTIC Robotics Hub - Onboarding Granted",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #2563eb; margin: 0 0 4px 0; font-size: 20px; font-weight: bold;">TEAM AXOTIC ROBOTICS CENTRAL</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0 0 16px 0;">Onboarding Access Whitelist Active</p>
                <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 20px;"></div>
                <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hello <strong>${displayName.trim()}</strong>,</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.5;">You have been registered as an active <strong>${finalRoleName}</strong> (${finalSubTeam}) on the AXOTIC Engineering Portal.</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.5;">Your Google Account has been whitelisted. You can log in instantly utilizing the official Google popup or email sign-in.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: bold; display: block; margin-bottom: 8px;">Your Registered Google Email:</span>
                  <span style="font-family: monospace; background-color: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 14px;">${email.trim().toLowerCase()}</span>
                </div>

                <div style="height: 1px; background-color: #f1f5f9; margin-top: 24px; margin-bottom: 16px;"></div>
                <p style="font-size: 11px; color: #94a3b8; font-family: monospace; margin: 0; text-align: center;">© 2026 AXOTIC ROBOTICS SECURE HUB</p>
              </div>
            `
          },
          createdAt: new Date().toISOString()
        });
      } catch (mailErr) {
        console.warn("Failed to write to Trigger Email Firestore subcollection:", mailErr instanceof Error ? mailErr.message : String(mailErr));
      }

      setSuccessMsg(`Successfully registered ${displayName.trim()}! Assigned role: ${finalRoleName} [${finalSubTeam}]. Notification dispatched to: ${email.trim().toLowerCase()}.`);
      
      createAdminLog(
        "MEMBER_ONBOARDED",
        `Onboarded new member "${displayName.trim()}" directly to active directory division "${finalSubTeam}" as role "${finalRoleName}" (${finalClearance}).`,
        currentUser
      );
      
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${newUid}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDisplayName("");
    setEmail("");
    setSelectedRoleId("core_engineer");
    setSubTeam(divisionTags[0] || "General");
    setCustomDivision("");
    setSpecifications("");
    setBirthday("");
    setAvatarUrl("");
    setPhoneNumber("");
    setHomepageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTimeout(() => {
      setSuccessMsg("");
    }, 8000);
  };

  return (
    <div id="add-member-view" className="w-full max-w-3xl mx-auto py-4">
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 sm:p-8 shadow-sm text-left">
        
        {/* Header */}
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="size-5 text-blue-600 animate-pulse" /> Add New Team Member
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register new students, mentors, or admins. Authorized users can log in instantly using their registered Gmail address.
          </p>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div id="add-member-success" className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 mb-6 animate-fade-in">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div id="add-member-error" className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 mb-6 animate-fade-in">
            <span className="size-2 bg-rose-500 rounded-full shrink-0" /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddMember} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Image Uploader */}
            <div className="md:col-span-1 flex flex-col items-center justify-start space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider text-center w-full">
                Profile Picture
              </label>

              <div className="relative group">
                <div className="size-28 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-xs flex items-center justify-center relative">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar preview" 
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Camera className="size-8 text-slate-300 mb-1" />
                      <span className="text-[10px] font-mono">No Image</span>
                    </div>
                  )}
                  {compressing && (
                    <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                      <div className="size-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-all cursor-pointer hover:scale-105"
                    title="Remove uploaded image"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>

              {/* Upload controls */}
              <div className="w-full text-center">
                <input
                  type="file"
                  id="picker-avatar-upload"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white border border-slate-250 hover:border-slate-400 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto shadow-xs"
                >
                  <Upload className="size-3 text-slate-500" />
                  {avatarUrl ? "Replace Picture" : "Upload Picture"}
                </button>
                <p className="text-[9px] text-slate-400 mt-2 font-sans leading-normal px-2">
                  Auto-compressed directly in your browser for database efficiency.
                </p>
              </div>

            </div>

            {/* Right Columns: Main Fields */}
            <div className="md:col-span-2 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-hidden transition-all text-slate-800"
                    placeholder="e.g. John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Mail className="size-3.5 text-slate-400" /> Gmail / Email <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm outline-hidden transition-all text-slate-800"
                    placeholder="e.g. john.doe@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Shield className="size-3.5 text-blue-600" /> Assigned Role Designation <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold cursor-pointer outline-hidden transition-all text-slate-800"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.clearance === "admin" ? "Admin Clearance" : "Standard Member"})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const r = customRoles.find(cr => cr.id === selectedRoleId);
                    if (!r) return null;
                    const col = ROLE_COLOR_MAP[r.color] || ROLE_COLOR_MAP.blue;
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${col.badge}`}>
                          <span className={`size-1.5 rounded-full ${col.dot}`} />
                          {r.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{r.description}</span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="size-3.5 text-blue-600" /> Engineering Division / Tag <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold cursor-pointer outline-hidden transition-all text-slate-800"
                    value={subTeam}
                    onChange={(e) => setSubTeam(e.target.value)}
                  >
                    {divisionTags.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                    <option value="Other">+ Custom Division Tag...</option>
                  </select>
                  {subTeam === "Other" && (
                    <input
                      type="text"
                      placeholder="Enter custom division name..."
                      value={customDivision}
                      onChange={(e) => setCustomDivision(e.target.value)}
                      className="mt-1.5 w-full bg-white border border-blue-300 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium outline-hidden"
                    />
                  )}
                  <span className="block text-[10px] text-slate-400 mt-1">
                    Associates member with engineering division milestones & projects.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="size-3.5 text-purple-600" /> Technical Specialty Tags
                </label>
                <TagInput
                  value={specifications}
                  onChange={setSpecifications}
                  placeholder="e.g. ROS 2, PCB Design, Computer Vision, SLAM..."
                  suggestions={specialtyTags}
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  Assign technical skillsets & specialties used for project team matching and build logs.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="size-3.5 text-slate-400" /> Birthday (Optional)
                </label>
                <input
                  type="date"
                  className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs outline-hidden transition-all text-slate-800 cursor-pointer"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>

              {/* Optional Panel */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest font-mono flex items-center justify-between">
                  <span>Contact Settings</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Authorized Account</span>
                </span>
                
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    📞 Contact Number
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs outline-hidden text-slate-700 font-mono"
                    placeholder="e.g. +1 (555) 019-2834"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    🌐 Personal Homepage / Website
                  </label>
                  <input
                    type="url"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs outline-hidden text-slate-700 font-mono"
                    placeholder="e.g. https://myportfolio.dev"
                    value={homepageUrl}
                    onChange={(e) => setHomepageUrl(e.target.value)}
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 select-none">
              <Sparkles className="size-3.5 text-amber-500" /> Real-time global synchronization active.
            </span>
            <button
              type="submit"
              disabled={loading || compressing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-2 active:scale-98 disabled:opacity-55"
            >
              {loading ? "Registering..." : (
                <>
                  <UserPlus className="size-4" /> Save & Onboard Member
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
