/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Lock, User, Info, RefreshCw, LogIn, UserPlus } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  defaultTab?: 'login' | 'signup';
}

// Convert unique human username into safe valid virtual email under the hood
const usernameToEmail = (uname: string) => {
  const clean = uname.trim().toLowerCase();
  const hex = Array.from(new TextEncoder().encode(clean))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex}@vgeoguesser.local`;
};

export default function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab === 'login' ? 'login' : 'signup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateUsername = (uname: string) => {
    const clean = uname.trim();
    if (clean.length < 2) {
      return "❌ 使用者名稱必須至少有 2 個字元！";
    }
    if (clean.length > 20) {
      return "❌ 使用者名稱太長，請小於 20 個字元！";
    }
    if (clean.toLowerCase() === 'guest' || clean.includes('@') || clean.includes('/') || clean.includes('\\')) {
      return "❌ 不合法的字元或保留字！";
    }
    return null;
  };

  const handleError = (error: any) => {
    console.error("Authentication action failed:", error);
    let msg = "認證失敗，請檢查輸入資訊。";
    if (error.code === 'auth/email-already-in-use') {
      msg = "❌ 該使用者名稱已被註冊，請換個名稱或直接登入！";
    } else if (error.code === 'auth/weak-password') {
      msg = "❌ 密碼強度不足，長度至少需達 8 個字元！";
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = "❌ 使用者名稱或密碼輸入錯誤，請重新確認！";
    } else if (error.message) {
      msg = `❌ 錯誤：${error.message}`;
    }
    setErrorMsg(msg);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const unameError = validateUsername(cleanUsername);
    if (unameError) {
      setErrorMsg(unameError);
      return;
    }

    if (password.length < 8) {
      setErrorMsg("❌ 密碼長度必須至少為 8 個字元！");
      return;
    }

    setIsLoading(true);
    try {
      const virtualEmail = usernameToEmail(cleanUsername);
      // Apply correct persistence layer according to 'Remember Me'
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, virtualEmail, password);
      onSuccess(`⚡ 歡迎回來 ${cleanUsername}！線上大賽統計與成就同步已啟用。`);
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const unameError = validateUsername(cleanUsername);
    if (unameError) {
      setErrorMsg(unameError);
      return;
    }

    if (password.length < 8) {
      setErrorMsg("❌ 密碼長度必須至少為 8 個字元！");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("❌ 密碼與確認密碼不一致！");
      return;
    }

    setIsLoading(true);
    try {
      const virtualEmail = usernameToEmail(cleanUsername);
      const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
      
      // Update global Auth profile with custom username
      await updateProfile(userCredential.user, {
        displayName: cleanUsername
      });

      onSuccess(`🎉 註冊成功！歡迎加入，您的專屬探險者號【${cleanUsername}】已就緒。`);
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none font-sans"
    >
      <motion.div
        initial={{ scale: 0.92, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: -15 }}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full shadow-2xl p-6 flex flex-col gap-4 font-sans"
      >
        {/* Header Block */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <span className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5 font-sans">
            {tab === 'login' && <LogIn className="w-4 h-4 text-blue-400" />}
            {tab === 'signup' && <UserPlus className="w-4 h-4 text-indigo-400" />}
            {tab === 'login' ? "探險家登入" : "註冊冒險帳號"}
          </span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-blue-400" /> 使用者名稱 (遊戲暱稱)
            </label>
            <input
              type="text"
              placeholder="請輸入註冊或登入的暱稱..."
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-blue-400" /> 密碼（長度至少 8 碼以上）
            </label>
            <input
              type="password"
              placeholder="請輸入您的密碼..."
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-400" /> 確認密碼
              </label>
              <input
                type="password"
                placeholder="請再次輸入密碼以利確認..."
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          {tab === 'login' && (
            <div className="flex items-center justify-between pt-0.5 text-[10px] sm:text-[11px]">
              <label className="flex items-center gap-1.5 text-neutral-400 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-neutral-950 border-neutral-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                />
                記住登入狀態
              </label>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] rounded-xl font-bold flex items-start gap-1.5 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 text-rose-450 mt-0.5" />
              <span className="whitespace-pre-line">{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition-all text-xs border border-blue-500/20 cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span className="font-sans">
                {tab === 'login' ? "登入世界賽場" : "註冊加入大賽"}
              </span>
            )}
          </button>
        </form>

        {/* Footer Switching Tab */}
        <div className="text-center pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 font-semibold font-sans">
          {tab === 'login' ? (
            <span className="font-sans">
              尚未加入？{" "}
              <button type="button" onClick={() => { setTab('signup'); setErrorMsg(null); }} className="text-indigo-400 hover:text-indigo-300 font-black cursor-pointer transition-colors font-sans">
                註冊新帳號
              </button>
            </span>
          ) : (
            <span className="font-sans">
              已有冒險帳號？{" "}
              <button type="button" onClick={() => { setTab('login'); setErrorMsg(null); }} className="text-blue-400 hover:text-blue-300 font-black cursor-pointer transition-colors font-sans">
                按此登入
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
