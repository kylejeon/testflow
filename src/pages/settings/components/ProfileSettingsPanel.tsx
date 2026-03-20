import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface ProfileSettingsPanelProps {
  fullName: string;
  email: string;
  avatarEmoji: string;
  onProfileUpdated: (name: string, emoji: string) => void;
}

const ANIMAL_EMOJIS = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
  '🦁','🐮','🐷','🐸','🐵','🐧','🐤','🦆','🦉','🦇',
  '🐺','🐴','🦄','🐝','🦋','🐌','🐢','🦎','🐙','🦈',
  '🐳','🐬','🦭','🦓','🦒','🐘','🦛','🦘','🦔','🐿️',
];

export default function ProfileSettingsPanel({
  fullName,
  email,
  avatarEmoji,
  onProfileUpdated,
}: ProfileSettingsPanelProps) {
  const [name, setName] = useState(fullName);
  const [selectedEmoji, setSelectedEmoji] = useState(avatarEmoji || '🐶');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
    const fetchProvider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const provider = user.app_metadata?.provider ?? 'email';
        setAuthProvider(provider);
      }
    };
    fetchProvider();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    try {
      setSavingProfile(true);
      setProfileError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim(), avatar_emoji: selectedEmoji })
        .eq('id', user.id);

      if (error) throw error;

      onProfileUpdated(name.trim(), selectedEmoji);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const profileChanged = name.trim() !== fullName || selectedEmoji !== (avatarEmoji || '🐶');

  return (
    <div className="space-y-10">

      {/* ── Avatar + Name ─────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Profile Information</h2>
        <p className="text-gray-500 text-sm mb-6">Update your display name and choose an avatar</p>

        <div className="flex items-start gap-8">
          {/* Avatar Column */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-4xl cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-all select-none"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Click to change avatar"
            >
              {selectedEmoji}
            </div>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer whitespace-nowrap"
            >
              {showEmojiPicker ? 'Close picker' : 'Change avatar'}
            </button>
          </div>

          {/* Name + Email */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setProfileError(''); }}
                placeholder="Enter your name"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-500 mb-1.5">Email</label>
              <p className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 select-all">
                {email}
              </p>
              <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Choose your avatar</p>
            <div className="grid grid-cols-10 gap-1.5">
              {ANIMAL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { setSelectedEmoji(emoji); setShowEmojiPicker(false); }}
                  className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer hover:bg-teal-50 hover:scale-110 ${
                    selectedEmoji === emoji
                      ? 'bg-teal-100 ring-2 ring-teal-400 scale-110'
                      : 'bg-gray-50'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {profileError && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
            <i className="ri-error-warning-line"></i>{profileError}
          </p>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !profileChanged}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingProfile ? (
              <><i className="ri-loader-4-line animate-spin"></i>Saving...</>
            ) : (
              <><i className="ri-save-line"></i>Save Profile</>
            )}
          </button>
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-sm text-teal-600 font-medium">
              <i className="ri-checkbox-circle-fill"></i>Profile updated!
            </span>
          )}
        </div>
      </div>

      {/* ── Password ──────────────────────────────── */}
      <div className="pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Change Password</h2>
        <p className="text-gray-500 text-sm mb-6">Set a new password for your account</p>

        {authProvider === 'google' ? (
          <div className="max-w-md p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-1">Signed in with Google</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your account uses Google for authentication. Password management is handled through your Google account — you can update it at{' '}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline font-medium"
                >
                  myaccount.google.com
                </a>
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className={`${showNewPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`}></i>
                </button>
              </div>
              {newPassword && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= i * 3
                          ? newPassword.length < 6 ? 'bg-red-400'
                          : newPassword.length < 10 ? 'bg-amber-400'
                          : 'bg-teal-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${
                    newPassword.length < 6 ? 'text-red-500'
                    : newPassword.length < 10 ? 'text-amber-500'
                    : 'text-teal-600'
                  }`}>
                    {newPassword.length < 6 ? 'Weak' : newPassword.length < 10 ? 'Fair' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className={`${showConfirmPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-base`}></i>
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <i className="ri-close-circle-line"></i>Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="mt-1 text-xs text-teal-600 flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>Passwords match
                </p>
              )}
            </div>

            {passwordError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <i className="ri-error-warning-line"></i>{passwordError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSavePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingPassword ? (
                  <><i className="ri-loader-4-line animate-spin"></i>Updating...</>
                ) : (
                  <><i className="ri-lock-password-line"></i>Update Password</>
                )}
              </button>
              {passwordSaved && (
                <span className="flex items-center gap-1.5 text-sm text-teal-600 font-medium">
                  <i className="ri-checkbox-circle-fill"></i>Password updated!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
