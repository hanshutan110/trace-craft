import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import type { ScreenId } from '../../types';
import { getPublicContent } from '../../api/content';
import {
  getLocalLegalDocument,
  publicContentToLegalDocument,
  type LegalDocument,
  type LegalDocumentKey,
} from '../../data/legalContent';
import { useI18n } from '../../i18n';
import { useToast } from '../common/Toast';

const LEGAL_SCREEN_KEYS: Partial<Record<ScreenId, LegalDocumentKey>> = {
  privacy_policy: 'privacy',
  user_agreement: 'agreement',
  permission_notice: 'permissions',
};

interface LegalDocumentScreenProps {
  screen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

function formatUpdatedAt(value: string): string {
  if (!value) return '2026-06-22';
  return value.slice(0, 10);
}

function readReturnScreen(): ScreenId {
  try {
    const raw = sessionStorage.getItem('tracecraft_legal_return_screen');
    if (raw === 'login') return 'login';
  } catch {
    // Ignore sessionStorage failures.
  }
  return 'settings';
}

export const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({ screen, onNavigate }) => {
  const { language, text } = useI18n();
  const { showToast } = useToast();
  const docKey = LEGAL_SCREEN_KEYS[screen] || 'privacy';
  const fallbackDoc = useMemo(() => getLocalLegalDocument(docKey, language), [docKey, language]);
  const [document, setDocument] = useState<LegalDocument>(fallbackDoc);
  const [returnScreen] = useState<ScreenId>(() => readReturnScreen());

  useEffect(() => {
    let cancelled = false;
    setDocument(fallbackDoc);
    const contentKey = language === 'en' ? `${docKey}_en` : docKey;
    getPublicContent('policy', contentKey)
      .then((content) => {
        if (!cancelled) setDocument(publicContentToLegalDocument(docKey, content));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [docKey, fallbackDoc, language]);

  return (
    <div className="flex flex-col min-h-full bg-[#f6f9fc] text-slate-800 select-none">
      <div className="h-[48px] border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0">
        <button
          onClick={() => onNavigate(returnScreen)}
          className="w-9 h-9 rounded-full bg-slate-50 active:bg-slate-100 flex justify-center items-center text-slate-600 transition-colors"
          title={text('返回设置', 'Back to settings')}
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <h2 className="text-[15px] font-black text-slate-800">{document.title}</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-[14px] bg-[#4FACFE]/10 border border-[#4FACFE]/15 flex items-center justify-center shrink-0">
              {docKey === 'permissions' ? (
                <ShieldCheck size={22} className="text-[#4FACFE] stroke-[2.4]" />
              ) : (
                <FileText size={22} className="text-[#4FACFE] stroke-[2.4]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-black leading-tight text-slate-900">{document.title}</p>
              <p className="text-[12px] leading-relaxed text-slate-500 mt-2">{document.summary}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-2">
                {text('更新日期', 'Updated')}: {formatUpdatedAt(document.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          {document.sections.map((section, sectionIndex) => (
            <section key={`${section.title}-${sectionIndex}`} className="bg-white border border-slate-100 rounded-[8px] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              {section.title && (
                <h3 className="text-[14px] font-black text-slate-850 leading-snug mb-2">{section.title}</h3>
              )}
              <div className="space-y-2">
                {section.body.map((paragraph, paragraphIndex) => (
                  <p key={`${sectionIndex}-${paragraphIndex}`} className="text-[12.5px] leading-[1.8] text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="px-4">
          <button
            onClick={() => {
              showToast(text('已确认阅读', 'Marked as read'));
              onNavigate(returnScreen);
            }}
            className="w-full h-11 rounded-full bg-[#4FACFE] text-white text-[13px] font-black shadow-lg shadow-[#4FACFE]/20 active:scale-[0.99] transition-transform"
          >
            {text('我已阅读', 'I have read this')}
          </button>
        </div>
      </div>
    </div>
  );
};
