import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, BedDouble, Users, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Residence, Room } from '@/types';

export function ResidenceInfoPage() {
  const { t, isKhmer } = useI18n();
  const [residences, setResidences] = useState<Residence[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: resData }, { data: roomData }] = await Promise.all([
        supabase.from('residences').select('*'),
        supabase.from('rooms').select('*'),
      ]);
      setResidences((resData as Residence[]) || []);
      setRooms((roomData as Room[]) || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const roomsForResidence = (residenceId: string) => rooms.filter((r) => r.residence_id === residenceId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-6 w-6 text-navy" />
          <h1 className={cn('text-2xl font-bold', isKhmer && 'font-khmer')}>{t('nav.residence')}</h1>
        </div>
        <p className="text-muted-foreground">Information about our residence facilities</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-48" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {residences.map((residence) => {
            const resRooms = roomsForResidence(residence.id);
            const totalCapacity = resRooms.reduce((sum, r) => sum + r.capacity, 0);
            return (
              <Card key={residence.id} className="overflow-hidden">
                <div className="h-32 bg-navy-gradient relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="h-16 w-16 text-gold/50" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-navy to-transparent">
                    <h2 className={cn('text-lg font-bold text-white', isKhmer && 'font-khmer')}>
                      {isKhmer && residence.name_km ? residence.name_km : residence.name}
                    </h2>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className={cn('text-sm text-muted-foreground mb-4', isKhmer && 'font-khmer')}>
                    {residence.description || ''}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <DoorOpen className="h-5 w-5 text-navy mx-auto mb-1" />
                      <div className="text-xl font-bold">{resRooms.length}</div>
                      <div className="text-xs text-muted-foreground">{t('common.room')}s</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <BedDouble className="h-5 w-5 text-navy mx-auto mb-1" />
                      <div className="text-xl font-bold">{totalCapacity}</div>
                      <div className="text-xs text-muted-foreground">{t('common.bed')}s</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <Users className="h-5 w-5 text-navy mx-auto mb-1" />
                      <div className="text-xl font-bold">{residence.type === 'boys' ? t('common.male') : t('common.female')}</div>
                      <div className="text-xs text-muted-foreground">{t('common.gender')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
