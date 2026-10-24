import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ContactPage() {
  const { t, isKhmer } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setName(''); setEmail(''); setSubject(''); setMessage('');
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className={cn('text-3xl font-bold text-navy mb-2', isKhmer && 'font-khmer')}>{t('contact.title')}</h1>
        <p className="text-muted-foreground">Get in touch with the residence office</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-navy-gradient flex items-center justify-center">
                  <Mail className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('contact.email')}</div>
                  <div className="text-sm font-medium">residence@example.edu</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-navy-gradient flex items-center justify-center">
                  <Phone className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('contact.phone')}</div>
                  <div className="text-sm font-medium">+855 00 000 000</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-navy-gradient flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('contact.address')}</div>
                  <div className="text-sm font-medium">Phnom Penh, Cambodia</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className={cn(isKhmer && 'font-khmer')}>{t('contact.sendMessage')}</CardTitle>
            </CardHeader>
            <CardContent>
              {sent && (
                <div className="mb-4 p-3 rounded-md bg-success/10 text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Message sent successfully!</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t('contact.yourName')}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('contact.email')}</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">{t('contact.subject')}</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t('contact.message')}</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
                </div>
                <Button type="submit" className="bg-navy-gradient">
                  <Send className="h-4 w-4 mr-2" />
                  {t('contact.sendMessage')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
