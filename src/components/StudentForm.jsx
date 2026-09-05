import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Send, WifiOff, History, CheckCircle } from 'lucide-react';

export default function StudentForm({ user }) {
  const [facilityName, setFacilityName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('good');
  const [imageUrl, setImageUrl] = useState('');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [cloudInspections, setCloudInspections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const offlineInspections = useLiveQuery(
    () => db.offline_inspections.where('user_id').equals(user.id).toArray(),
    [user.id]
  );

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchCloudHistory();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchCloudHistory = async () => {
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setCloudInspections(data);
  };

  const handleCaptureImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setImageUrl(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    const payload = {
      user_id: user.id,
      user_email: user.email,
      facility_name: facilityName,
      description,
      status,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    };

    if (!navigator.onLine) {
      await db.offline_inspections.add(payload);
      setSuccessMsg('Đang offline - Dữ liệu đã lưu tạm vào bộ nhớ thiết bị!');
    } else {
      try {
        const { error } = await supabase.from('inspections').insert([payload]);
        if (error) throw error;
        setSuccessMsg('Gửi báo cáo thành công lên máy chủ Cloud!');
        fetchCloudHistory();
      } catch (err) {
        await db.offline_inspections.add(payload);
        setSuccessMsg('Lỗi kết nối - Dữ liệu đã được lưu tạm offline!');
      }
    }

    setFacilityName('');
    setDescription('');
    setStatus('good');
    setImageUrl('');
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {!onlineStatus && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-xl flex items-center gap-3">
          <WifiOff size={20} className="text-amber-600" />
          <span className="font-medium text-sm">Đang offline - Dữ liệu đã lưu tạm</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Tạo Phiếu Khảo sát Cơ sở Vật chất</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Cơ sở Vật chất / Vị trí</label>
            <input
              type="text"
              required
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Ví dụ: Khu B - Phòng máy B102"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả tình trạng</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Mô tả chi tiết sự cố hoặc tình trạng hiện tại..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng đánh giá</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            >
              <option value="good">🟢 Hoạt động tốt</option>
              <option value="maintenance">🟡 Cần bảo trì</option>
              <option value="danger">🔴 Hỏng hóc / Nguy hiểm</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh chụp minh chứng</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="camera-input"
              onChange={handleCaptureImage}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => document.getElementById('camera-input').click()}
              className="w-full border-2 border-dashed border-slate-300 hover:border-blue-500 py-3 rounded-xl flex items-center justify-center gap-2 text-slate-600 font-medium transition"
            >
              <Camera size={20} />
              Chụp ảnh từ Camera API
            </button>
            {imageUrl && (
              <div className="mt-3 relative inline-block">
                <img src={imageUrl} alt="Preview" className="h-28 w-28 object-cover rounded-xl border" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {submitting ? 'Đang gửi...' : 'Gửi Khảo sát'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History size={20} /> Lịch sử Khảo sát Cá nhân
        </h3>

        {offlineInspections?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Đang chờ đồng bộ (Offline Queue)</h4>
            <div className="space-y-2">
              {offlineInspections.map((item) => (
                <div key={item.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{item.facility_name}</span>
                    <p className="text-slate-500 text-xs">{item.description}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-medium">Offline</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {cloudInspections.map((item) => (
            <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-slate-900">{item.facility_name}</h4>
                <p className="text-slate-600 text-sm mt-1">{item.description}</p>
                <span className="text-xs text-slate-400 mt-2 block">{new Date(item.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                item.status === 'good' ? 'bg-emerald-100 text-emerald-800' :
                item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.status === 'good' ? 'Tốt' : item.status === 'maintenance' ? 'Bảo trì' : 'Hỏng'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
