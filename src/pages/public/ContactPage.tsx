import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Send,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import {
  fetchContactMessagesFromDb,
  saveContactMessagesToDb,
  ContactMessageItem,
  loadCachedContactConfig,
  fetchContactConfigFromDb,
  BipaContactConfig
} from '@/components/layout/Sidebar';

export function ContactPage() {
  const { lang } = useI18n();
  const isKh = lang === 'km';

  const [contactCfg, setContactCfg] = useState<BipaContactConfig>(() =>
    loadCachedContactConfig()
  );

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    const loadCfg = () => {
      fetchContactConfigFromDb().then(setContactCfg);
    };
    loadCfg();
    window.addEventListener('contact-config-updated', loadCfg);
    return () => window.removeEventListener('contact-config-updated', loadCfg);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !message.trim()) return;

    setSending(true);
    const existing = await fetchContactMessagesFromDb();
    const newMsg: ContactMessageItem = {
      id: `msg-${Date.now()}`,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim() || 'មិនបញ្ជាក់អ៊ីមែល',
      subject: subject.trim() || 'សារទំនាក់ទំនងទូទៅ',
      message: message.trim(),
      createdAt: new Date().toISOString(),
      isRead: false
    };

    await saveContactMessagesToDb([newMsg, ...existing]);
    setSending(false);
    setSenderName('');
    setSenderEmail('');
    setSubject('');
    setMessage('');
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 font-khmer space-y-8 pb-24">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-extrabold">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{isKh ? 'ទំនាក់ទំនងមកកាន់យើងខ្ញុំ' : 'Get In Touch With Us'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {isKh
            ? 'សមាគមជនជាតិដើមភាគតិចព្នង (BIPA)'
            : 'The Bunong Indigenous People Association (BIPA)'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {isKh
            ? 'ប្រសិនបើអ្នកមានចម្ងល់ ឬត្រូវការព័ត៌មានបន្ថែម សូមទាក់ទងមកកាន់យើងខ្ញុំតាមរយៈបណ្តាញខាងក្រោម ឬផ្ញើសារដោយផ្ទាល់។'
            : 'If you have any questions or need assistance, please reach out via the channels below or send us a direct message.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-3">
          <a
            href={`mailto:${contactCfg.email}`}
            className="group block p-4 rounded-2xl bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isKh ? 'អ៊ីមែលផ្លូវការ' : 'Official Email'}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {contactCfg.email}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-amber-500 shrink-0" />
            </div>
          </a>

          <a
            href={`tel:${contactCfg.phoneDial}`}
            className="group block p-4 rounded-2xl bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isKh ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {contactCfg.phoneDisplayKm}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
            </div>
          </a>

          <a
            href={contactCfg.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-4 rounded-2xl bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isKh ? 'គេហទំព័រផ្លូវការ (Website)' : 'Official Website'}
                  </p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                    {contactCfg.websiteDisplay}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
            </div>
          </a>

          <a
            href={contactCfg.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-4 rounded-2xl bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-400">
                    {isKh ? 'អាសយដ្ឋានមណ្ឌល' : 'Address'}
                  </p>
                  <p className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-relaxed">
                    {isKh ? contactCfg.addressKm : contactCfg.addressEn || contactCfg.addressKm}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-rose-500 shrink-0 mt-1" />
            </div>
          </a>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#162033] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                {isKh ? 'បណ្តាញសង្គមផ្លូវការ៖' : 'Official Social Media:'}
              </p>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
                {contactCfg.facebookPageName}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <a
                href={contactCfg.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/25 transition-all active:scale-95 group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
                <span className="text-[11px] font-black">Facebook</span>
              </a>

              <a
                href={contactCfg.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#FF0000] hover:text-white border border-[#FF0000]/25 transition-all active:scale-95 group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="text-[11px] font-black">YouTube</span>
              </a>

              <a
                href={contactCfg.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/25 transition-all active:scale-95 group"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span className="text-[11px] font-black">Telegram</span>
              </a>
            </div>
          </div>
        </div>

        <Card className="lg:col-span-7 bg-white dark:bg-[#162033] border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-md">
          <CardContent className="p-5 sm:p-7 space-y-5">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {isKh ? 'ផ្ញើសារមកកាន់គណៈគ្រប់គ្រង' : 'Send a Message'}
            </h2>

            {sentSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  {isKh
                    ? 'សាររបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់គណៈគ្រប់គ្រងមណ្ឌលដោយជោគជ័យ!'
                    : 'Your message has been sent to the administration dashboard!'}
                </span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                    {isKh ? 'ឈ្មោះរបស់អ្នក *' : 'Your Name *'}
                  </label>
                  <Input
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder={isKh ? 'ឧ.បញ្ចូលឈ្មោះរបស់អ្នក...' : 'Enter your name...'}
                    className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                    {isKh ? 'អ៊ីមែល ឬលេខទូរស័ព្ទ' : 'Email or Phone'}
                  </label>
                  <Input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder={isKh ? 'ឧ.បញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ...' : 'Enter email or phone...'}
                    className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                  {isKh ? 'ប្រធានបទ' : 'Subject'}
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={isKh ? 'ឧ.បញ្ចូលប្រធានបទនៃសារ...' : 'Enter message subject...'}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                  {isKh ? 'ខ្លឹមសារនៃសារ *' : 'Message *'}
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isKh ? 'សរសេរសារ ឬសំណួររបស់អ្នកនៅទីនេះ...' : 'Write your message here...'}
                  className="w-full h-32 rounded-2xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 p-3.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md"
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                {sending
                  ? isKh
                    ? 'កំពុងផ្ញើសារ...'
                    : 'Sending...'
                  : isKh
                  ? 'ផ្ញើសារ'
                  : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}