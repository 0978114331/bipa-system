import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, CheckCircle2, Circle, Printer, Download, Trash2, LogOut, LogIn, Calendar } from 'lucide-react';
import { BipaStudent, initialStudents } from '@/pages/admin/StudentListPage';
import { AttendanceRecord } from '@/pages/AttendancePage';
import { normalizeGenderToKhmer } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

const ATT_STORAGE_KEY = 'bipa_attendance_sync_v4';
const hasKhmerScript = (text?: string) => /[\u1780-\u17FF]/.test(String(text || ''));

export function AttendancePage() {
  const [isCheckIn, setIsCheckIn] = useState(true);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [selectedIsoDate, setSelectedIsoDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const resolveStudentDetails = (code: string | undefined, rawName: string, rawGender: string, dir: BipaStudent[]) => {
    const cleanCode = String(code || '').trim().replace(/\s+/g, '').toLowerCase();
    const cleanName = String(rawName || '').trim().toLowerCase();

    const foundInit = initialStudents.find(
      (d) =>
        (cleanCode && d.student_code.toLowerCase() === cleanCode) ||
        (cleanName && d.full_name_en.toLowerCase() === cleanName) ||
        (cleanName && d.full_name_km.toLowerCase() === cleanName)
    );
    const foundDir = dir.find(
      (d) =>
        (cleanCode && String(d.student_code || '').trim().replace(/\s+/g, '').toLowerCase() === cleanCode) ||
        (cleanName && String(d.full_name_en || '').trim().toLowerCase() === cleanName) ||
        (cleanName && String(d.full_name_km || '').trim().toLowerCase() === cleanName)
    );

    const bestKhmerName = hasKhmerScript(foundDir?.full_name_km)
      ? foundDir!.full_name_km
      : hasKhmerScript(foundInit?.full_name_km)
      ? foundInit!.full_name_km
      : hasKhmerScript(rawName)
      ? rawName
      : foundInit?.full_name_km || foundDir?.full_name_km || rawName;

    const bestGender =
      foundInit?.gender_km === 'ស្រី' || foundDir?.gender_km === 'ស្រី' || normalizeGenderToKhmer(rawGender) === 'ស្រី'
        ? 'ស្រី'
        : 'ប្រុស';

    return {
      nameKm: bestKhmerName,
      genderKm: bestGender,
      finalCode: (foundDir?.student_code || foundInit?.student_code || code || '').trim().toUpperCase(),
    };
  };

  const loadRecords = async () => {
    let localDir: BipaStudent[] = [];
    const savedDir = localStorage.getItem('bipa_students_directory_v2') || localStorage.getItem('bipa_students_directory');
    if (savedDir) {
      try {
        const parsed = JSON.parse(savedDir);
        if (Array.isArray(parsed)) localDir = parsed;
      } catch {}
    }

    const dirList = [...localDir, ...initialStudents];

    try {
      const { data: dbAtt, error } = await supabase
        .from('bipa_attendance')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbAtt) {
        const mapped: AttendanceRecord[] = dbAtt.map((r: any) => {
          const info = resolveStudentDetails(r.student_code, r.full_name || '', r.gender || '', dirList);
          return {
            id: String(r.id),
            student_code: info.finalCode,
            name: info.nameKm,
            gender: info.genderKm,
            time_out: r.time_out || '--:--:--',
            time_in: r.time_in || '--:--:--',
            status: String(r.status || 'ចេញក្រៅ').replace('[HIDDEN]', '').trim(),
            date: r.attendance_date,
          };
        });
        setAllRecords(mapped);
        return;
      }
    } catch {}

    const saved = localStorage.getItem(ATT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: AttendanceRecord[] = JSON.parse(saved);
        const mapped = parsed.map((r) => {
          const info = resolveStudentDetails(r.student_code, r.name, r.gender, dirList);
          return {
            ...r,
            student_code: info.finalCode,
            name: info.nameKm,
            gender: info.genderKm,
            status: String(r.status || 'ចេញក្រៅ').replace('[HIDDEN]', '').trim(),
          };
        });
        setAllRecords(mapped);
      } catch {
        setAllRecords([]);
      }
    } else {
      setAllRecords([]);
    }
  };

  useEffect(() => {
    loadRecords();
    const timer = setInterval(loadRecords, 2000);
    window.addEventListener('attendance-updated', loadRecords);
    window.addEventListener('storage', loadRecords);
    return () => {
      clearInterval(timer);
      window.removeEventListener('attendance-updated', loadRecords);
      window.removeEventListener('storage', loadRecords);
    };
  }, []);

  const targetDateString = (() => {
    if (!selectedIsoDate) return new Date().toDateString();
    const [y, m, d] = selectedIsoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toDateString();
  })();

  const filteredRecords = allRecords.filter((r) => r.date === targetDateString);

  const handleDeleteRecord = async (id: string, studentCode?: string, recDate?: string) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យនេះចេញពីតារាងរក្សាទុកទិន្នន័យជាអចិន្ត្រៃយ៍មែនទេ?')) return;
    const updated = allRecords.filter((r) => r.id !== id);
    setAllRecords(updated);
    localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify(updated));
    try {
      await supabase.from('bipa_attendance').delete().eq('id', id);
      if (studentCode && recDate) {
        await supabase
          .from('bipa_attendance')
          .delete()
          .eq('attendance_date', recDate)
          .eq('student_code', studentCode);
      }
    } catch {}
    window.dispatchEvent(new Event('attendance-updated'));
  };

  const handleDeleteAllByDate = async () => {
    const displayDate = selectedIsoDate.split('-').reverse().join('/');
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបទិន្នន័យរក្សាទុកសម្រាប់ថ្ងៃទី ${displayDate} ទាំងអស់ចេញពីប្រព័ន្ធជាអចិន្ត្រៃយ៍មែនទេ?`)) return;
    const remaining = allRecords.filter((r) => r.date !== targetDateString);
    setAllRecords(remaining);
    localStorage.setItem(ATT_STORAGE_KEY, JSON.stringify(remaining));
    try {
      await supabase.from('bipa_attendance').delete().eq('attendance_date', targetDateString);
    } catch {}
    window.dispatchEvent(new Event('attendance-updated'));
  };

  const handleDownloadQR = async () => {
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=BIPA-STATION';
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'BIPA-Wall-QRCode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>BIPA Wall QR Code</title>
          <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: 'Kantumruy Pro', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; color: #000; }
            .card { text-align: center; border: 4px solid #1e3a8a; padding: 50px; border-radius: 28px; }
            h1 { font-size: 28px; color: #1e3a8a; margin: 0 0 8px 0; }
            p { font-size: 16px; color: #475569; margin: 0 0 30px 0; }
            img { width: 340px; height: 340px; }
            .code-tag { margin-top: 24px; font-size: 15px; font-weight: 700; color: #1e293b; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>ស្កែនទីនេះដើម្បីចុះវត្តមាន (ចេញ-ចូល)</h1>
            <p>Scan here to record your daily attendance</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=BIPA-STATION" alt="QR Code" />
            <div class="code-tag">BIPA STUDENT RESIDENCE</div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.focus(); window.print(); window.close(); }, 350); };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;

    const displayDate = selectedIsoDate.split('-').reverse().join('/');
    const presentCount = filteredRecords.filter((s) => s.status === 'វត្តមាន' || s.status === 'ចេញក្រៅ').length;
    const leaveCount = filteredRecords.filter((s) => s.status === 'ច្បាប់').length;
    const absentCount = filteredRecords.filter((s) => s.status === 'អវត្តមាន').length;

    const rowsHtml = filteredRecords
      .map(
        (stu, i) => `<tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="padding-left:12px; font-weight:600;">${stu.name}</td>
          <td style="text-align:center;">${stu.gender}</td>
          <td style="text-align:center; color:#d97706; font-weight:600;">${stu.time_out || '--:--:--'}</td>
          <td style="text-align:center; color:#16a34a; font-weight:600;">${stu.time_in || '--:--:--'}</td>
          <td style="text-align:center;">
            <span style="padding:4px 8px; border-radius:12px; font-size:11px; font-weight:600; border: 1px solid #ccc;">${stu.status}</span>
          </td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>របាយការណ៍វត្តមាន (${displayDate})</title>
          <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Kantumruy Pro', sans-serif; margin: 0; color: #000; }
            .header-title { text-align: center; color: #1e40af; margin-bottom: 18px; }
            .header-title h1 { margin: 0 0 5px 0; font-size: 21px; }
            .header-title p { margin: 0; font-size: 13px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; padding: 9px 5px; text-align: center; white-space: nowrap; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 5px; white-space: nowrap; }
            .summary { display: flex; justify-content: space-between; margin-top: 22px; font-size: 13px; font-weight: 600; }
            .summary div { padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header-title">
            <h1>របាយការណ៍វត្តមានសិស្សប្រចាំថ្ងៃ (ចេញ-ចូល)</h1>
            <p>កាលបរិច្ឆេទ: ${displayDate} | BIPA Admin</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:45px;">ល.រ</th>
                <th style="text-align:left; padding-left:12px;">ឈ្មោះសិស្ស</th>
                <th style="width:65px;">ភេទ</th>
                <th style="width:110px;">ម៉ោងស្គែនចេញ (១)</th>
                <th style="width:110px;">ម៉ោងស្គែនចូល (២)</th>
                <th style="width:95px;">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding: 28px; color:#94a3b8;">មិនមានទិន្នន័យ</td></tr>'}
            </tbody>
          </table>
          <div class="summary">
            <div style="color:#2563eb; background:#eff6ff;">សិស្សសរុប: ${filteredRecords.length}</div>
            <div style="color:#16a34a; background:#f0fdf4;">វត្តមាន: ${presentCount}</div>
            <div style="color:#d97706; background:#fffbeb;">ច្បាប់: ${leaveCount}</div>
            <div style="color:#dc2626; background:#fef2f2;">អវត្តមាន: ${absentCount}</div>
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.focus(); window.print(); window.close(); }, 300); };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 font-khmer text-slate-200 space-y-6">
      <div className="bg-[#1e293b] rounded-xl p-6 shadow-sm border border-slate-800">
        <div className="inline-block bg-[#eab308] text-[#0f172a] text-xs font-bold px-2.5 py-1 rounded mb-3">
          ស្កែនកូដ QR
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Record Attendance</h1>
        <p className="text-slate-400 text-sm">Scan student ID QR code to record attendance automatically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-[#1e293b] border-slate-800">
            <CardContent className="p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 text-white font-bold mb-2">
                  <QrCode className="h-5 w-5 text-blue-400" />
                  Scanner Settings
                </div>
                <p className="text-xs text-slate-400 mb-3">Select Action Before Scanning:</p>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setIsCheckIn(true)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                      isCheckIn
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-700 text-slate-400'
                    )}
                  >
                    {isCheckIn ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    Check In
                  </button>
                  <button
                    onClick={() => setIsCheckIn(false)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                      !isCheckIn
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                        : 'border-slate-700 text-slate-400'
                    )}
                  >
                    {!isCheckIn ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    Check Out
                  </button>
                </div>
              </div>

              <div className="border border-slate-700 rounded-xl p-5 flex flex-col items-center text-center bg-[#0f172a]/70 space-y-3">
                <div className="text-xs font-bold text-slate-300">
                  កូដ QR សម្រាប់បិទនៅជញ្ជាំងឱ្យសិស្សស្កែន
                </div>
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=BIPA-STATION"
                    alt="BIPA Wall QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  សិស្សអាចបើកកាមេរ៉ាស្កែនកូដនេះដើម្បីកត់ត្រាម៉ោងចេញ និងម៉ោងចូល
                </p>
                <div className="grid grid-cols-2 gap-2 w-full pt-1">
                  <Button
                    onClick={handleDownloadQR}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> ទាញយក QR
                  </Button>
                  <Button
                    onClick={handlePrintQR}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold h-9"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> បោះពុម្ព QR
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-[#1e293b] border-slate-800 h-full">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold">
                  <QrCode className="h-5 w-5 text-blue-400" />
                  <span>Today's Scanned List</span>
                  <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full font-bold ml-1">
                    {filteredRecords.length} Records
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex items-center">
                    <Calendar className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="date"
                      value={selectedIsoDate}
                      onChange={(e) => setSelectedIsoDate(e.target.value)}
                      className="h-9 pl-9 pr-3 rounded-lg bg-[#0f172a] border border-slate-700 text-xs font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const now = new Date();
                      const yyyy = now.getFullYear();
                      const mm = String(now.getMonth() + 1).padStart(2, '0');
                      const dd = String(now.getDate()).padStart(2, '0');
                      setSelectedIsoDate(`${yyyy}-${mm}-${dd}`);
                    }}
                    className="h-9 px-3 bg-[#0f172a] border-slate-700 text-slate-300 hover:text-white text-xs font-bold"
                  >
                    ថ្ងៃនេះ
                  </Button>

                  <Button
                    onClick={handlePrintList}
                    className="h-9 px-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> បោះពុម្ព (Print)
                  </Button>

                  {filteredRecords.length > 0 && (
                    <Button
                      onClick={handleDeleteAllByDate}
                      className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> លុបទិន្នន័យថ្ងៃនេះ
                    </Button>
                  )}
                </div>
              </div>

              {filteredRecords.length > 0 ? (
                <div className="border border-slate-700 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800/95 text-slate-300 text-xs sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-bold">ឈ្មោះសិស្ស</th>
                        <th className="px-3 py-3 font-bold text-center">ភេទ</th>
                        <th className="px-3 py-3 font-bold text-center">ម៉ោងចេញ / ចូល</th>
                        <th className="px-3 py-3 font-bold text-center">ស្ថានភាព</th>
                        <th className="px-3 py-3 font-bold text-center">លុប</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 text-slate-200">
                          <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                            {rec.name}
                            {rec.student_code && (
                              <span className="ml-1.5 text-[11px] text-blue-400 font-semibold">
                                ({rec.student_code})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-xs whitespace-nowrap">{rec.gender}</td>
                          <td className="px-3 py-3 text-center text-xs whitespace-nowrap">
                            <span className="text-amber-400 mr-2.5 font-semibold">
                              <LogOut className="h-3 w-3 inline mr-0.5" />
                              {rec.time_out}
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              <LogIn className="h-3 w-3 inline mr-0.5" />
                              {rec.time_in}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span
                              className={cn(
                                'text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                                rec.status === 'វត្តមាន'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : rec.status === 'ចេញក្រៅ'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              )}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleDeleteRecord(rec.id, rec.student_code, rec.date)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mb-3 opacity-20" />
                  <p>No students have been scanned on this date.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}