import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Eye, Heart, Users, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AboutPage() {
  const { t, isKhmer } = useI18n();

  const sections = [
    {
      icon: Target,
      title: t('about.purpose'),
      content: 'The Student Residence Management System is designed to provide a safe, organized, and comfortable living environment for students. It streamlines residence operations including attendance tracking, payment management, duty scheduling, and communication between students and residence administrators.',
    },
    {
      icon: Eye,
      title: t('about.vision'),
      content: 'To create a model student residence that fosters academic excellence, personal growth, and a strong sense of community through efficient management and transparent communication.',
    },
    {
      icon: Heart,
      title: t('about.mission'),
      content: 'To provide comprehensive residence management services that ensure student well-being, fair duty distribution, timely payment processing, and clear communication of all residence-related information.',
    },
    {
      icon: Users,
      title: t('about.guidelines'),
      content: '1. Respect all residents and staff members.\n2. Maintain cleanliness in shared spaces.\n3. Follow the duty schedule diligently.\n4. Submit leave requests before departure.\n5. Pay monthly contributions on time.\n6. Report any maintenance issues promptly.\n7. Attend check-in and check-out as scheduled.',
    },
    {
      icon: Users,
      title: t('about.responsibilities'),
      content: '1. Complete assigned duties on time.\n2. Keep personal and shared spaces clean.\n3. Respect quiet hours and study times.\n4. Follow QR attendance check-in/check-out daily.\n5. Submit monthly rice and cash contributions.\n6. Inform residence admin of any issues.\n7. Participate in residence meetings.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className={cn('text-3xl font-bold text-navy mb-2', isKhmer && 'font-khmer')}>{t('about.title')}</h1>
        <p className="text-muted-foreground">Learn about our residence management system</p>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-gradient flex items-center justify-center">
                  <section.icon className="h-5 w-5 text-gold" />
                </div>
                <CardTitle className={cn('text-lg', isKhmer && 'font-khmer')}>{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className={cn('text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed', isKhmer && 'font-khmer')}>
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy-gradient flex items-center justify-center">
                <Phone className="h-5 w-5 text-gold" />
              </div>
              <CardTitle className={cn('text-lg', isKhmer && 'font-khmer')}>{t('about.contactInfo')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('contact.email')}</div>
                <div className="text-sm font-medium">residence@example.edu</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{t('contact.phone')}</div>
                <div className="text-sm font-medium">+855 00 000 000</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
