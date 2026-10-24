import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Camera, CheckCircle2, UserCheck, UserMinus, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AttendancePage() {
  const { t, isKhmer } = useI18n();
  const { toast } = useToast();
  const [actionType, setActionType] = useState<'check_in' | 'check_out'>('check_in');
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load today's attendance records
  const fetchRecentRecords = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data,} = await supabase
      .from('attendance_records')
      .select('id, action, recorded_at, students(student_id, english_name, khmer_name, residence_type)')
      .gte('recorded_at', `${today}T00:00:00Z`)
      .order('recorded_at', { ascending: false })
      .limit(10);
    
    if (data) setRecentRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecentRecords();

    // Initialize Scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      false
    );

    let isProcessing = false;

    scanner.render(async (decodedText) => {
      if (isProcessing) return;
      isProcessing = true;
      
      try {
        // 1. Find Student by ID
        const { data: student, error: stuErr } = await supabase
          .from('students')
          .select('id, student_id, english_name, khmer_name')
          .eq('student_id', decodedText)
          .single();

        if (stuErr || !student) {
          toast({ variant: 'destructive', title: 'Error', description: `Student ID [${decodedText}] not found!` });
          setTimeout(() => { isProcessing = false; }, 2000);
          return;
        }

        // 2. Insert Attendance Record
        const { error: attErr } = await supabase
          .from('attendance_records')
          .insert({
            student_id: student.id,
            action: actionType, // check_in or check_out based on Radio selection
          });

        if (attErr) {
          toast({ variant: 'destructive', title: 'Error', description: attErr.message });
        } else {
          const sName = student.khmer_name || student.english_name;
          toast({ title: 'Success', description: `${sName} has been marked as ${actionType === 'check_in' ? 'Check In' : 'Check Out'}!` });
          fetchRecentRecords();
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'System Error', description: err.message });
      }

      // Resume scanning after 2 seconds
      setTimeout(() => { isProcessing = false; }, 2000);
    }, (_error) => { /* ignore */ });

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [actionType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-navy-gradient text-white p-6 rounded-xl shadow">
        <div>
          <Badge className="bg-gold text-navy font-bold mb-2 uppercase">{t('qr.scan')}</Badge>
          <h1 className={cn('text-2xl font-bold', isKhmer && 'font-khmer')}>Record Attendance</h1>
          <p className="text-sm text-white/70 mt-1">Scan student ID QR code to record attendance automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Scanner */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-5 w-5 text-navy" /> Scanner Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label className="mb-2 block text-muted-foreground">Select Action Before Scanning:</Label>
                <RadioGroup 
                  value={actionType} 
                  onValueChange={(val: any) => setActionType(val)} 
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2 border p-2 rounded-md hover:bg-muted">
                    <RadioGroupItem value="check_in" id="check_in" />
                    <Label htmlFor="check_in" className="flex items-center gap-2 cursor-pointer w-full text-green-600 font-bold">
                      <UserCheck className="h-4 w-4" /> Check In
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-2 rounded-md hover:bg-muted">
                    <RadioGroupItem value="check_out" id="check_out" />
                    <Label htmlFor="check_out" className="flex items-center gap-2 cursor-pointer w-full text-amber-600 font-bold">
                      <UserMinus className="h-4 w-4" /> Check Out
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div id="qr-reader" className="w-full border-2 border-dashed border-muted rounded-xl overflow-hidden bg-muted/20"></div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Attendance Table */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-navy" /> Today's Scanned List
              </CardTitle>
              <Badge variant="outline">{recentRecords.length} Records</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">{t('common.loading')}</div>
              ) : recentRecords.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                  <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  No students have been scanned today.
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>{record.students?.student_id}</TableCell>
                          <TableCell>{record.students?.khmer_name || record.students?.english_name}</TableCell>
                          <TableCell>
                                <Badge 
                                    variant="outline" 
                                    className={record.action === 'check_in' ? 'bg-green-100 text-green-700 border-transparent' : 'bg-amber-100 text-amber-700 border-transparent'}>
                                    {record.action === 'check_in' ? 'Check In' : 'Check Out'}
                                </Badge>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}