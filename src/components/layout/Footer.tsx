import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  const [sysLogo, setSysLogo] = useState("https://i.ibb.co/tphX7kd4/ce2e43f3-9d48-4d71-86a6-dd1ac3d77c49.png");
  const [sysNameKm, setSysNameKm] = useState("មណ្ឌលនិស្សិត BIPA");
  const [sysNameEn, setSysNameEn] = useState("BIPA");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('bipa_settings').select('*').eq('id', '1').single();
        if (data) {
          setSysLogo(data.logo_url);
          setSysNameKm(data.name_km);
          setSysNameEn(data.name_en);
        }
      } catch (error) {
        console.error(error);
      }
    };
    
    fetchSettings();
    window.addEventListener('system-settings-updated', fetchSettings);
    return () => window.removeEventListener('system-settings-updated', fetchSettings);
  }, []);

  return (
    <footer className="hidden md:block bg-[#090e17] text-slate-300 py-12 border-t border-slate-800/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-xl">
                <img src={sysLogo} alt="Logo" className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{sysNameKm}</h3>
                <p className="text-xs text-amber-500 font-semibold">{sysNameEn} Management System</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              គ្រប់គ្រងការចូលចេញ ការបង់ប្រាក់ប្រចាំខែ ការរួមចំណែកអង្ករ កាលវិភាគកិច្ចការ និងសកម្មភាពប្រចាំថ្ងៃទាំងអស់ក្នុងវេទិកាតែមួយប្រកបដោយប្រសិទ្ធភាព។
            </p>
          </div>

          <div className="md:pl-10">
            <h4 className="text-amber-500 font-bold mb-4 text-base">Quick Links</h4>
            <ul className="space-y-2.5 text-sm font-semibold">
              <li><Link to="/" className="text-slate-400 hover:text-white transition-colors">ទំព័រដើម</Link></li>
              <li><Link to="/about" className="text-slate-400 hover:text-white transition-colors">អំពីយើង</Link></li>
              <li><Link to="/residence" className="text-slate-400 hover:text-white transition-colors">ព័ត៌មានមណ្ឌល</Link></li>
              <li><Link to="/announcements" className="text-slate-400 hover:text-white transition-colors">សេចក្តីប្រកាស</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-white transition-colors">ទំនាក់ទំនង</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-amber-500 font-bold mb-4 text-base">Contact Information</h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-blue-400"/> Khouvchvea123@gmail.com
              </li>
              <li className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-emerald-400"/> +855 978114331
              </li>
              <li className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 text-rose-400"/> Phnom Penh, Cambodia
              </li>
            </ul>
          </div>

        </div>
        
        <div className="mt-10 pt-6 border-t border-slate-800/60 text-center text-xs text-slate-500 font-semibold">
          &copy; {new Date().getFullYear()} {sysNameEn}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}