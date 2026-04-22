import { chatbotAPI } from './apiClient.js';
import { i18n } from './i18n.js';

export async function askChatbot(userId, message, riskData) {
  // Normalize riskData — level can be a full object { label, color, ... } from riskEngine
  const normalized = {
    score: riskData?.score ?? 0,
    level: riskData?.level?.label ?? riskData?.level ?? 'Unknown',
    city:  riskData?.city  ?? null,
    nearbyIncidents: riskData?.nearbyIncidents ?? null,
  };
  
  const currentLang = i18n.currentLang;
  console.log('[ChatService] Asking chatbot with language:', currentLang);
  console.log('[ChatService] Message:', message);
  
  const result = await chatbotAPI.ask(userId, message, normalized, currentLang);
  
  console.log('[ChatService] Response received:', result.response?.substring(0, 100));
  console.log('[ChatService] Response contains Hindi:', /[\u0900-\u097F]/.test(result.response));
  
  return result;
}
