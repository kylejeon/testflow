import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Avatar } from '../../../components/Avatar';

interface ProfileSettingsPanelProps {
  fullName: string;
  email: string;
  avatarEmoji: string;
  onProfileUpdated: (name: string, emoji: string) => void;
}

export default function ProfileSettingsPanel({
  fullName,
  email,
  avatarEmoji,
  onProfileUpdated,
}: ProfileSettingsPanelProps) {
  const [name, setName] = useState(fullName);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [authProvider, setAuthProvider] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const provider = user.app_metadata?.provider ?? 'email';
        setAuthProvider(provider);
        setUserId(user.id);
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.avatar_url) setPhotoUrl(data.avatar_url);
      }
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) { setProfileError('Name cannot be empty.'); return; }
    try {
      setSavingProfile(true);
      setProfileError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id);
      if (error) throw error;
      onProfileUpdated(name.trim(), avatarEmoji);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    try {
      setUploadingPhoto(true);
      const path = `${userId}.webp`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl } as Record<string, string>).eq('id', userId);
      setPhotoUrl(publicUrl + '?t=' + Date.now());
    } catch {
      // silently fail
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!userId) return;
    try {
      await supabase.storage.from('avatars').remove([`${userId}.webp`]);
      await supabase.from('profiles').update({ avatar_url: null } as Record<string, unknown>).eq('id', userId);
      setPhotoUrl(null);
    } catch { /* silently fail */ }
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    if (!newPassword) { setPasswordError('Please enter a new password.'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }
    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword(''); setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const profileChanged = name.trim() !== fullName;

  const pwStrength = newPassword.length === 0 ? null
    : newPassword.length < 6 ? { level: 1, label: 'Weak', color: '#EF4444' }
    : newPassword.length < 10 ? { level: 2, label: 'Fair', color: '#F59E0B' }
    : { level: 3, label: 'Strong', color: '#6366F1' };

  return (
    <>
      {/* ── Profile Information ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 mb-5">
        <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Profile Information</h3>
        <p className="text-[0.8125rem] text-[#64748B] mb-5">Update your personal information and avatar.</p>

        {/* Avatar row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-14 h-14 rounded-full overflow-hidden">
              <Avatar userId={userId || undefined} name={name || fullName} email={email} photoUrl={photoUrl || undefined} size="xl" />
            </div>
            <div className="absolute bottom-[-2px] right-[-2px] w-5 h-5 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center">
              {uploadingPhoto
                ? <i className="ri-loader-4-line text-[#64748B] animate-spin" style={{ fontSize: '0.625rem' }}></i>
                : <i className="ri-camera-line text-[#64748B]" style={{ fontSize: '0.625rem' }}></i>
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div>
            <div className="text-[0.8125rem] font-semibold text-[#0F172A]">{name || fullName}</div>
            <div className="text-[0.6875rem] text-[#94A3B8] mt-0.5">Click to upload profile photo</div>
            {photoUrl && (
              <button onClick={handleRemovePhoto} className="mt-1.5 text-[0.6875rem] text-[#DC2626] cursor-pointer border-none bg-transparent p-0 hover:underline">
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Full Name + Email 2-col row */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-semibold text-[#334155]">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setProfileError(''); }}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem] text-[#1E293B]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8125rem] font-semibold text-[#334155]">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] text-[0.8125rem] text-[#1E293B] opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        {profileError && (
          <p className="mb-3 text-[0.8125rem] text-red-600 flex items-center gap-1.5">
            <i className="ri-error-warning-line"></i>{profileError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !profileChanged}
            className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
          >
            {savingProfile ? <><i className="ri-loader-4-line animate-spin"></i>Saving...</> : <><i className="ri-save-line"></i>Save Changes</>}
          </button>
          {profileSaved && (
            <span className="text-[0.8125rem] text-[#6366F1] font-medium flex items-center gap-1">
              <i className="ri-checkbox-circle-fill"></i>Saved!
            </span>
          )}
        </div>
      </div>

      {/* ── Password ── */}
      {authProvider === 'google' ? (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[0.625rem] p-6 mb-5">
          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-5">Password</h3>
          <div className="flex items-center gap-4 p-5 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="w-10 h-10 rounded-lg border border-[#E2E8F0] flex items-center justify-center flex-shrink-0 bg-white">
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[0.8125rem] font-semibold text-[#0F172A]">Signed in with Google</div>
              <div className="text-[0.75rem] text-[#64748B]">Password management is handled by your Google account.</div>
            </div>
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.75rem] font-semibold text-[#6366F1] no-underline whitespace-nowrap flex items-center gap-1 hover:underline"
            >
              <i className="ri-external-link-line"></i> Google Account Settings
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-[0.625rem] p-6 mb-5">
          <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-0.5">Password</h3>
          <p className="text-[0.8125rem] text-[#64748B] mb-5">Change your account password. Not available for Google SSO accounts.</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8125rem] font-semibold text-[#334155]">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 pr-9 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem] text-[#1E293B]"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer">
                  <i className={`${showNewPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`}></i>
                </button>
              </div>
              {pwStrength && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-0.5 flex-1 h-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex-1 rounded-full" style={{ background: i <= pwStrength.level ? pwStrength.color : '#E2E8F0' }}></div>
                    ))}
                  </div>
                  <span className="text-[0.6875rem] font-semibold" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.8125rem] font-semibold text-[#334155]">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 pr-9 border border-[#E2E8F0] rounded-md bg-[#F8FAFC] focus:outline-none focus:border-[#C7D2FE] text-[0.8125rem] text-[#1E293B]"
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] cursor-pointer">
                  <i className={`${showConfirmPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`}></i>
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[0.6875rem] text-red-500 flex items-center gap-1"><i className="ri-close-circle-line"></i>Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-[0.6875rem] text-[#6366F1] flex items-center gap-1"><i className="ri-checkbox-circle-line"></i>Passwords match</p>
              )}
            </div>
          </div>

          {passwordError && (
            <p className="mb-3 text-[0.8125rem] text-red-600 flex items-center gap-1.5">
              <i className="ri-error-warning-line"></i>{passwordError}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-[0.3125rem] text-[0.8125rem] font-semibold px-4 py-[0.4375rem] rounded-md bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 1px 3px rgba(99,102,241,0.3)' }}
            >
              {savingPassword ? <><i className="ri-loader-4-line animate-spin"></i>Updating...</> : <><i className="ri-lock-line"></i>Change Password</>}
            </button>
            {passwordSaved && (
              <span className="text-[0.8125rem] text-[#6366F1] font-medium flex items-center gap-1">
                <i className="ri-checkbox-circle-fill"></i>Password updated!
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
