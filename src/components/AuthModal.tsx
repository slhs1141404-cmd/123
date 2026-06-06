/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Mail, Lock, User, Info, RefreshCw, Key, LogIn, UserPlus } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  defaultTab?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  };

  const handleError = (error: any) => {
    console.error("Authentication action failed:", error);
    let msg = "認證失敗，請檢查輸入資訊。";
    if (error.code === 'auth/email-already-in-use') {
      msg = "❌ 該電子郵件已被註冊，請直接登入！";
    } else if (error.code === 'auth/invalid-email') {
      msg = "❌ 請輸入格式正確的電子郵件！";
    } else if (error.code === 'auth/weak-password') {
      msg = "❌ 密碼強度不足，長度至少需達 8 個字元！";
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = "❌ 電子郵件或密碼輸入錯誤，請重新確認！";
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      msg = `🚫 未授權的網域 (unauthorized-domain)

💡 【發生原因】
此 Firebase 專案未將您目前造訪的網域列入安全白名單。

【請依照以下簡單步驟排除（約需 1 分鐘）】：
1. 開啟 [Firebase 控制台](https://console.firebase.google.com/)。
2. 進入本專案，選取左側選單的 【Authentication】並切換至【設定 (Settings)】標籤頁。
3. 找到【授權網域 (Authorized domains)】區塊，點擊【新增網域 (Add domain)】並新增以下網域：
   👉 **${currentDomain}**
   👉 **ais-pre-p6xbxzoojkbdddp2upeoz7-749001144565.asia-east1.run.app**
   👉 **ais-dev-p6xbxzoojkbdddp2upeoz7-749001144565.asia-east1.run.app**

【此時可用的 100% 成功替代方案】：
您不需要完成上述設定，直接在下方輸入「電子郵件與密碼」即可完成註冊與登入！此功能在預覽環境 100% 運作良好，能立刻記錄您的大賽積分。`;
    } else if (error.code === 'auth/popup-closed-by-user') {
      msg = `⚠️ Google 登入視窗已被關閉。

💡 [預覽環境提示]
本遊戲目前運行在內嵌的預覽視窗 (IFrame) 中，為遵循瀏覽器同源策略與跨網域阻擋，Google 彈出視窗有時會被自動關閉或通訊失敗。

【請選擇以下方式繼續】：
1. 點擊右上角「在新分頁中開啟應用程式」按鈕，在獨立分頁即可完美使用 Google 快速登入。
2. 或直接在下方輸入信箱與密碼進行註冊/登入（大推薦！此功能在預覽環境 100% 運作良好，能完美同步與儲存您的世界大賽積分）。`;
    } else if (error.code === 'auth/popup-blocked') {
      msg = `🚫 彈出視窗已被瀏覽器阻擋！

💡 [預覽環境提示]
瀏覽器安全性通常會阻擋內嵌視窗的 Popup。

【請選擇以下方式繼續】：
1. 點擊右上角「在新分頁中開啟應用程式」按鈕即可正常使用 Google 登入。
2. 同時也強烈建議您直接在下方使用一般的「電子信箱與密碼」進行登入。`;
    } else if (error.code === 'auth/cancelled-popup-request') {
      msg = `⚠️ Google 登入請求已被取消。

💡 [預覽環境提示]
由於多次點擊或預覽視窗 (IFrame) 通訊中斷。

【請選擇以下方式繼續】：
1. 點擊右上角「在新分頁中開啟應用程式」按鈕重試。
2. 或是使用下方的「一般電子信箱與密碼」註冊與登入。`;
    } else if (error.message) {
      msg = `❌ 錯誤：${error.message}`;
    }
    setErrorMsg(msg);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateEmail(email)) {
      setErrorMsg("❌ 請提供正確格式的信箱位址！");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("❌ 密碼長度必須至少為 8 個字元！");
      return;
    }

    setIsLoading(true);
    try {
      // Apply correct persistence layer according to 'Remember Me'
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess("⚡ 歡迎回來！您已成功登入。線上大賽統計與成就同步已啟用。");
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg("❌ 請輸入使用者名稱（暱稱）！");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg("❌ 請提供正確格式的信箱位址！");
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateEmail(email)) {
      setErrorMsg("❌ 請輸入正確的電子郵件信箱位址！");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      onSuccess(`📧 密碼重設郵件已發送至【${email}】，請至收件匣確認。`);
      setTab('login');
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess("⚡ 已透過 Google 帳號快速登入世界大賽中樞！");
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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none"
    >
      <motion.div
        initial={{ scale: 0.92, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: -15 }}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full shadow-2xl p-6 flex flex-col gap-4 font-sans"
      >
        {/* Header Block */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <span className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
            {tab === 'login' && <LogIn className="w-4 h-4 text-blue-400" />}
            {tab === 'signup' && <UserPlus className="w-4 h-4 text-indigo-400" />}
            {tab === 'forgot' && <Key className="w-4 h-4 text-emerald-400" />}
            {tab === 'login' && "探險家登入"}
            {tab === 'signup' && "註冊冒險帳號"}
            {tab === 'forgot' && "重設您的密碼"}
          </span>
          <button onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Form */}
        <form onSubmit={tab === 'login' ? handleEmailLogin : tab === 'signup' ? handleEmailSignup : handleForgotPassword} className="space-y-3.5">
          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-400" /> 使用者名稱（修改暱稱）
              </label>
              <input
                type="text"
                placeholder="輸入您的世界大賽稱號..."
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Mail className="w-3 h-3 text-blue-400" /> 電子郵件信箱
            </label>
            <input
              type="email"
              placeholder="explorer@earth.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {tab !== 'forgot' && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-400" /> 密碼鍵入（至少 8 字元）
              </label>
              <input
                type="password"
                placeholder="******"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-400" /> 確認密碼
              </label>
              <input
                type="password"
                placeholder="******"
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
              <button
                type="button"
                onClick={() => { setTab('forgot'); setErrorMsg(null); }}
                className="text-blue-400 hover:text-blue-300 font-black cursor-pointer transition-colors"
              >
                忘記密碼？
              </button>
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
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition-all text-xs border border-blue-500/20 cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>
                {tab === 'login' && "登入世界賽場"}
                {tab === 'signup' && "註冊加入大賽"}
                {tab === 'forgot' && "發送密碼重設信件"}
              </span>
            )}
          </button>
        </form>

        {/* Divider / Google Login Area */}
        <div className="space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <span className="relative px-3 bg-neutral-900 text-[10px] text-neutral-500 font-black uppercase tracking-wider">或</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white border border-neutral-800 hover:border-neutral-700 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {/* Elegant SVG Google Icon Logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>使用 Google 快速登入</span>
          </button>
        </div>

        {/* Footer Switching Tab */}
        <div className="text-center pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 font-semibold">
          {tab === 'login' ? (
            <span>
              尚未加入？{" "}
              <button type="button" onClick={() => { setTab('signup'); setErrorMsg(null); }} className="text-indigo-400 hover:text-indigo-300 font-black cursor-pointer transition-colors">
                註冊新帳號
              </button>
            </span>
          ) : (
            <span>
              已有冒險帳號？{" "}
              <button type="button" onClick={() => { setTab('login'); setErrorMsg(null); }} className="text-blue-400 hover:text-blue-300 font-black cursor-pointer transition-colors">
                按此登入
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
