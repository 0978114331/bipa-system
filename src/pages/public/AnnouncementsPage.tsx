import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Announcement } from '@/types';

export function AnnouncementsPage() {
  const { t, isKhmer, lang } = useI18n();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'payment_deadline', 'duty_schedule', 'cleaning', 'meeting', 'notice'];

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      setAnnouncements((data as Announcement[]) || []);
      setLoading(false);
    };
    fetchAnnouncements();
  }, []);

  const filtered = selectedCategory === 'all'
    ? announcements
    : announcements.filter((a) => a.category === selectedCategory);

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      payment_deadline: t('announcement.paymentDeadline'),
      duty_schedule: t('announcement.dutySchedule'),
      cleaning: t('announcement.cleaning'),
      meeting: t('announcement.meeting'),
      notice: t('announcement.notice'),
    };
    return map[cat] || cat;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone className="h-6 w-6 text-navy" />
          <h1 className={cn('text-2xl font-bold', isKhmer && 'font-khmer')}>{t('nav.announcements')}</h1>
        </div>
        <p className="text-muted-foreground">Stay updated with the latest residence notices</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={cn(selectedCategory === cat && 'bg-navy-gradient', isKhmer && 'font-khmer')}
          >
            {cat === 'all' ? t('common.all') : categoryLabel(cat)}
          </Button>
        ))}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className={cn('text-muted-foreground', isKhmer && 'font-khmer')}>{t('announcement.noAnnouncements')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((announcement) => (
            <Card key={announcement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className={cn('text-lg', isKhmer && 'font-khmer')}>
                      {isKhmer && announcement.title_km ? announcement.title_km : announcement.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabel(announcement.category)}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(announcement.published_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className={cn('text-sm text-muted-foreground whitespace-pre-wrap', isKhmer && 'font-khmer')}>
                  {isKhmer && announcement.content_km ? announcement.content_km : announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
