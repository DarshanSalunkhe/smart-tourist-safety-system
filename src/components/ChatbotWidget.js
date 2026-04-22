import { askChatbot } from '../services/chatService.js';
import { riskEngine } from '../services/risk-engine.js';

export function createChatbotWidget(userId) {
  if (document.getElementById('chatbot-styles')) return;

  const style = document.createElement('style');
  style.id = 'chatbot-styles';
  style.textContent = `
    /* ── FAB ── */
    .cb-fab {
      position: fixed; bottom: 96px; right: 22px;
      width: 58px; height: 58px; border-radius: 50%;
      border: none; cursor: pointer; z-index: 1001;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      color: #fff; font-size: 1.4rem;
      box-shadow: 0 4px 20px rgba(124,58,237,.45), 0 2px 8px rgba(0,0,0,.2);
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
      display: flex; align-items: center; justify-content: center;
    }
    .cb-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(124,58,237,.6); }
    .cb-fab .cb-fab-badge {
      position: absolute; top: -3px; right: -3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #ef4444; color: #fff; font-size: .65rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; display: none;
    }
    .cb-fab .cb-fab-badge.show { display: flex; }

    /* ── PANEL ── */
    .cb-panel {
      position: fixed; bottom: 168px; right: 22px;
      width: 360px; height: 520px;
      background: var(--card, #fff);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.1);
      display: flex; flex-direction: column;
      z-index: 1001; overflow: hidden;
      border: 1px solid var(--border, #e2e8f0);
      transform-origin: bottom right;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease;
    }
    .cb-panel.hidden {
      transform: scale(.85) translateY(12px);
      opacity: 0; pointer-events: none;
    }

    /* ── HEADER ── */
    .cb-header {
      padding: .85rem 1rem;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      color: #fff; flex-shrink: 0;
      display: flex; align-items: center; gap: .65rem;
    }
    .cb-header-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .cb-header-info { flex: 1; min-width: 0; }
    .cb-header-name { font-size: .9rem; font-weight: 700; line-height: 1.2; }
    .cb-header-status {
      font-size: .7rem; opacity: .8;
      display: flex; align-items: center; gap: .3rem;
    }
    .cb-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #4ade80; flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(74,222,128,.3);
    }
    .cb-header-actions { display: flex; align-items: center; gap: .3rem; }
    .cb-icon-btn {
      width: 30px; height: 30px; border-radius: 8px; border: none;
      background: rgba(255,255,255,.15); color: #fff; cursor: pointer;
      font-size: .85rem; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .cb-icon-btn:hover { background: rgba(255,255,255,.25); }

    /* ── RISK BANNER ── */
    .cb-risk-banner {
      padding: .5rem 1rem;
      font-size: .75rem; font-weight: 600;
      display: flex; align-items: center; gap: .4rem;
      flex-shrink: 0; border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .cb-risk-banner.safe { background: rgba(16,185,129,.08); color: #065f46; }
    .cb-risk-banner.medium { background: rgba(245,158,11,.08); color: #92400e; }
    .cb-risk-banner.high { background: rgba(239,68,68,.08); color: #b91c1c; }

    /* ── MESSAGES ── */
    .cb-messages {
      flex: 1; overflow-y: auto; padding: .85rem;
      display: flex; flex-direction: column; gap: .6rem;
      scroll-behavior: smooth;
    }
    .cb-messages::-webkit-scrollbar { width: 3px; }
    .cb-messages::-webkit-scrollbar-thumb { background: var(--border, #e2e8f0); border-radius: 3px; }

    /* ── MESSAGE BUBBLES ── */
    .cb-msg-wrap { display: flex; gap: .5rem; align-items: flex-end; }
    .cb-msg-wrap.user { flex-direction: row-reverse; }
    .cb-msg-wrap > div:not(.cb-msg-avatar) { max-width: 78%; min-width: 0; }
    .cb-msg-avatar {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700;
    }
    .cb-msg-avatar.bot { background: linear-gradient(135deg,#7c3aed,#2563eb); color: #fff; }
    .cb-msg-avatar.user { background: var(--primary, #2563eb); color: #fff; }
    .cb-msg {
      padding: .6rem .85rem; border-radius: 16px;
      font-size: .85rem; line-height: 1.5;
      word-break: break-word; word-wrap: break-word;
    }
    .cb-msg.bot {
      background: var(--bg, #f8fafc); color: var(--text, #0f172a);
      border: 1px solid var(--border, #e2e8f0);
      border-bottom-left-radius: 4px;
    }
    .cb-msg.user {
      background: linear-gradient(135deg, #2563eb, #6366f1);
      color: #fff; border-bottom-right-radius: 4px;
    }
    .cb-msg.typing { padding: .7rem 1rem; }
    .cb-typing-dots { display: flex; gap: 4px; align-items: center; }
    .cb-typing-dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--text-muted, #94a3b8);
      animation: cbDot 1.2s ease-in-out infinite;
    }
    .cb-typing-dots span:nth-child(2) { animation-delay: .2s; }
    .cb-typing-dots span:nth-child(3) { animation-delay: .4s; }
    @keyframes cbDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }
    .cb-msg-time {
      font-size: .65rem; color: var(--text-muted, #94a3b8);
      margin-top: .2rem; padding: 0 .25rem;
    }
    .cb-msg-wrap.user .cb-msg-time { text-align: right; }

    /* ── QUICK REPLIES ── */
    .cb-quick-replies {
      display: flex; flex-wrap: wrap; gap: .4rem;
      padding: .5rem .85rem 0;
    }
    .cb-quick-btn {
      padding: .3rem .7rem; border-radius: 20px; border: 1.5px solid var(--primary, #2563eb);
      background: transparent; color: var(--primary, #2563eb);
      font-size: .75rem; font-weight: 600; cursor: pointer;
      transition: all .15s; font-family: inherit;
    }
    .cb-quick-btn:hover { background: var(--primary, #2563eb); color: #fff; }

    /* ── INPUT ROW ── */
    .cb-input-row {
      padding: .7rem; border-top: 1px solid var(--border, #e2e8f0);
      display: flex; gap: .4rem; align-items: center; flex-shrink: 0;
      background: var(--card, #fff);
    }
    .cb-input {
      flex: 1; padding: .55rem .85rem; border-radius: 20px;
      border: 1.5px solid var(--border, #e2e8f0);
      font-size: .85rem; outline: none;
      background: var(--bg, #f8fafc); color: var(--text, #0f172a);
      transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
    }
    .cb-input:focus {
      border-color: var(--primary, #2563eb);
      box-shadow: 0 0 0 3px rgba(37,99,235,.12);
    }
    .cb-input::placeholder { color: var(--text-muted, #94a3b8); }
    .cb-send {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #2563eb, #6366f1);
      color: #fff; cursor: pointer; font-size: .9rem;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s, box-shadow .15s;
      box-shadow: 0 2px 8px rgba(37,99,235,.35); flex-shrink: 0;
    }
    .cb-send:hover { transform: scale(1.08); box-shadow: 0 4px 14px rgba(37,99,235,.5); }
    .cb-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }
    .cb-mic {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: var(--ai, #8b5cf6); color: #fff; cursor: pointer;
      font-size: .9rem; display: flex; align-items: center; justify-content: center;
      transition: all .15s; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(139,92,246,.35);
    }
    .cb-mic:hover { background: var(--ai-dark, #7c3aed); transform: scale(1.08); }
    .cb-mic.listening {
      background: #ef4444;
      animation: cbMicPulse 1s ease-in-out infinite;
    }
    @keyframes cbMicPulse {
      0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}
      50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}
    }

    /* ── DARK MODE ── */
    [data-theme="dark"] .cb-panel {
      background: #1c2333; border-color: #30363d;
    }
    [data-theme="dark"] .cb-msg.bot {
      background: #161b22; border-color: #30363d; color: #e2e8f0;
    }
    [data-theme="dark"] .cb-input {
      background: #161b22; border-color: #30363d; color: #e2e8f0;
    }
    [data-theme="dark"] .cb-input-row { background: #1c2333; border-color: #30363d; }
    [data-theme="dark"] .cb-risk-banner.safe { background: rgba(16,185,129,.12); }
    [data-theme="dark"] .cb-risk-banner.medium { background: rgba(245,158,11,.12); }
    [data-theme="dark"] .cb-risk-banner.high { background: rgba(239,68,68,.12); }

    /* ── MOBILE ── */
    @media(max-width:480px) {
      .cb-panel { width: calc(100vw - 24px); right: 12px; bottom: 160px; height: 480px; }
      .cb-fab { right: 12px; bottom: 88px; }
    }
  `;
  document.head.appendChild(style);

  let speakerEnabled = true;
  let isOpen = false;
  let unreadCount = 0;

  const QUICK_REPLIES = ['Risk score?', 'SOS help', 'Safety tips', 'Night safety', 'Scam alerts'];

  // ── FAB ──
  const fab = document.createElement('button');
  fab.className = 'cb-fab';
  fab.setAttribute('aria-label', 'Open SafeTrip AI Assistant');
  fab.innerHTML = `🤖<span class="cb-fab-badge" id="cbBadge"></span>`;

  // ── PANEL ──
  const panel = document.createElement('div');
  panel.className = 'cb-panel hidden';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'SafeTrip AI Assistant');

  const riskStatus = riskEngine.getStatus?.() || {};
  const riskScore = riskStatus.score ?? 0;
  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'safe';
  const riskEmoji = riskLevel === 'high' ? '🔴' : riskLevel === 'medium' ? '🟡' : '🟢';
  const riskText = riskLevel === 'high' ? 'High Risk Area' : riskLevel === 'medium' ? 'Medium Risk' : 'Safe Zone';

  panel.innerHTML = `
    <div class="cb-header">
      <div class="cb-header-avatar">🤖</div>
      <div class="cb-header-info">
        <div class="cb-header-name">SafeTrip AI</div>
        <div class="cb-header-status">
          <span class="cb-status-dot"></span>
          <span>Online · AI Assistant</span>
        </div>
      </div>
      <div class="cb-header-actions">
        <button class="cb-icon-btn" id="cbSpeaker" title="Toggle voice">🔊</button>
        <button class="cb-icon-btn" id="cbClose" title="Close">✕</button>
      </div>
    </div>
    <div class="cb-risk-banner ${riskLevel}" id="cbRiskBanner">
      ${riskEmoji} ${riskText} · Score: ${riskScore}/100
    </div>
    <div class="cb-messages" id="cbMessages"></div>
    <div class="cb-quick-replies" id="cbQuickReplies"></div>
    <div class="cb-input-row">
      <input class="cb-input" id="cbInput" placeholder="Ask anything about safety…" autocomplete="off" />
      <button class="cb-mic" id="cbMic" title="Voice input">🎤</button>
      <button class="cb-send" id="cbSend" title="Send">➤</button>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  // ── Quick replies ──
  const qrContainer = panel.querySelector('#cbQuickReplies');
  QUICK_REPLIES.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'cb-quick-btn';
    btn.textContent = q;
    btn.addEventListener('click', () => sendMessage(q));
    qrContainer.appendChild(btn);
  });

  // ── Welcome message ──
  addBotMessage("Hi! I'm your SafeTrip AI assistant. Ask me about your risk score, safety tips, SOS, or anything about your trip. 🛡️");

  // ── Toggle panel ──
  function openPanel() {
    isOpen = true;
    panel.classList.remove('hidden');
    unreadCount = 0;
    const badge = document.getElementById('cbBadge');
    if (badge) badge.classList.remove('show');
    setTimeout(() => panel.querySelector('#cbInput')?.focus(), 100);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.add('hidden');
  }

  fab.addEventListener('click', () => isOpen ? closePanel() : openPanel());
  panel.querySelector('#cbClose').addEventListener('click', closePanel);

  // ── Speaker toggle ──
  panel.querySelector('#cbSpeaker').addEventListener('click', (e) => {
    speakerEnabled = !speakerEnabled;
    e.currentTarget.textContent = speakerEnabled ? '🔊' : '🔇';
    e.currentTarget.title = speakerEnabled ? 'Mute voice' : 'Enable voice';
  });

  // ── Helpers ──
  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addBotMessage(text) {
    const messages = document.getElementById('cbMessages');
    if (!messages) return;
    const wrap = document.createElement('div');
    wrap.className = 'cb-msg-wrap';
    wrap.innerHTML = `
      <div class="cb-msg-avatar bot">AI</div>
      <div>
        <div class="cb-msg bot">${text}</div>
        <div class="cb-msg-time">${getTime()}</div>
      </div>`;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;

    if (!isOpen) {
      unreadCount++;
      const badge = document.getElementById('cbBadge');
      if (badge) { badge.textContent = unreadCount; badge.classList.add('show'); }
    }
  }

  function addUserMessage(text) {
    const messages = document.getElementById('cbMessages');
    if (!messages) return;
    const wrap = document.createElement('div');
    wrap.className = 'cb-msg-wrap user';
    wrap.innerHTML = `
      <div class="cb-msg-avatar user">You</div>
      <div>
        <div class="cb-msg user">${text}</div>
        <div class="cb-msg-time">${getTime()}</div>
      </div>`;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTypingIndicator() {
    const messages = document.getElementById('cbMessages');
    if (!messages) return null;
    const wrap = document.createElement('div');
    wrap.className = 'cb-msg-wrap';
    wrap.id = 'cbTyping';
    wrap.innerHTML = `
      <div class="cb-msg-avatar bot">AI</div>
      <div class="cb-msg bot typing">
        <div class="cb-typing-dots"><span></span><span></span><span></span></div>
      </div>`;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  // ── Send message ──
  async function sendMessage(text) {
    const input = document.getElementById('cbInput');
    const sendBtn = document.getElementById('cbSend');
    const query = text || input?.value.trim();
    if (!query) return;

    if (!isOpen) openPanel();
    addUserMessage(query);
    if (input) input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    // Hide quick replies after first real message
    if (qrContainer) qrContainer.style.display = 'none';

    const typing = addTypingIndicator();
    // Show a label after 2s so users know Gemini is processing (not a hang)
    const slowTimer = setTimeout(() => {
      const t = document.getElementById('cbTyping');
      if (t) {
        const label = document.createElement('div');
        label.id = 'cbSlowLabel';
        label.style.cssText = 'font-size:.7rem;color:var(--text-muted);padding:.1rem .25rem;';
        label.textContent = '⏳ AI is thinking…';
        t.querySelector('div:last-child')?.appendChild(label);
      }
    }, 2000);

    try {
      const riskData = riskEngine.getStatus?.() || {};
      const result = await askChatbot(userId, query, riskData);
      const response = result.response || 'Sorry, I could not get a response.';
      clearTimeout(slowTimer);
      typing?.remove();
      
      // Debug logging
      console.log('[Chatbot] Response received:', response);
      console.log('[Chatbot] Response language detected:', /[\u0900-\u097F]/.test(response) ? 'Hindi/Marathi' : 
                  /[\u0B80-\u0BFF]/.test(response) ? 'Tamil' : 
                  /[\u0C00-\u0C7F]/.test(response) ? 'Telugu' : 'English/Other');
      console.log('[Chatbot] Current language setting:', localStorage.getItem('language'));
      
      addBotMessage(response);
      if (speakerEnabled) {
        console.log('[Chatbot] Speaker enabled, calling voice service...');
        console.log('[Chatbot] Response text:', response);
        console.log('[Chatbot] Response length:', response.length);
        
        import('../services/voice.js').then(({ voiceService }) => {
          console.log('[Chatbot] Voice service loaded, calling speak()...');
          voiceService.speak(response, 'auto');
          console.log('[Chatbot] speak() called');
        }).catch((err) => {
          console.error('[Chatbot] Voice error:', err);
        });
      } else {
        console.log('[Chatbot] Speaker disabled, skipping voice');
      }
    } catch {
      clearTimeout(slowTimer);
      typing?.remove();
      addBotMessage('❌ Could not reach SafeTrip AI. Check your connection.');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // ── Mic ──
  panel.querySelector('#cbMic').addEventListener('click', () => {
    const micBtn = panel.querySelector('#cbMic');
    const input = document.getElementById('cbInput');
    import('../services/voice.js').then(({ voiceService }) => {
      micBtn.classList.add('listening');
      micBtn.textContent = '⏹';
      if (input) { input.value = ''; input.placeholder = '🔊 Listening…'; }
      voiceService.startAIListening();
      micBtn.onclick = () => {
        voiceService.stop();
        window.speechSynthesis?.cancel();
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎤';
        if (input) input.placeholder = 'Ask anything about safety…';
        micBtn.onclick = null;
      };
    });
  });

  // ── Voice events ──
  window.addEventListener('voiceListeningStarted', () => {
    const micBtn = document.getElementById('cbMic');
    const input = document.getElementById('cbInput');
    if (micBtn) micBtn.textContent = '⏹';
    if (input) input.placeholder = '🎤 Speak now…';
  });

  window.addEventListener('voiceInterimText', (e) => {
    const input = document.getElementById('cbInput');
    if (input) input.value = e.detail.text;
  });

  window.addEventListener('voiceAIResponse', (e) => {
    const { question, answer } = e.detail;
    const micBtn = document.getElementById('cbMic');
    const input = document.getElementById('cbInput');
    if (!isOpen) openPanel();
    if (input) { input.value = ''; input.placeholder = 'Ask anything about safety…'; }
    if (micBtn) { micBtn.classList.remove('listening'); micBtn.textContent = '🎤'; micBtn.onclick = null; }
    addUserMessage(`🎤 ${question}`);
    addBotMessage(answer);
  });

  window.addEventListener('voiceAIError', (e) => {
    const micBtn = document.getElementById('cbMic');
    const input = document.getElementById('cbInput');
    if (micBtn) { micBtn.classList.remove('listening'); micBtn.textContent = '🎤'; micBtn.onclick = null; }
    if (input) input.placeholder = 'Ask anything about safety…';
    const errors = {
      'not-allowed': '❌ Microphone access denied. Allow mic in browser settings.',
      'no-speech': '⚠️ No speech detected. Please try again.',
      'network': '❌ Network error during voice recognition.',
    };
    addBotMessage(errors[e.detail?.error] || `❌ Voice error: ${e.detail?.error}`);
  });

  // ── Input events ──
  document.getElementById('cbSend').addEventListener('click', () => sendMessage());
  document.getElementById('cbInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── Update risk banner when score changes ──
  window.addEventListener('riskScoreUpdated', (e) => {
    const banner = document.getElementById('cbRiskBanner');
    if (!banner) return;
    const s = e.detail?.score ?? 0;
    const lvl = s >= 70 ? 'high' : s >= 40 ? 'medium' : 'safe';
    const emoji = lvl === 'high' ? '🔴' : lvl === 'medium' ? '🟡' : '🟢';
    const txt = lvl === 'high' ? 'High Risk Area' : lvl === 'medium' ? 'Medium Risk' : 'Safe Zone';
    banner.className = `cb-risk-banner ${lvl}`;
    banner.textContent = `${emoji} ${txt} · Score: ${s}/100`;
  });
}
