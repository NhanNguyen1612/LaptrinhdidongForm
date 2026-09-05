import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Send, WifiOff, History, CheckCircle, MapPin, ClipboardList, Navigation } from 'lucide-react';

export default function StudentForm({ user }) {
  const [facilityName, setFacilityName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('good');
  const [imageUrl, setImageUrl] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');

  const [teacherRequests, setTeacherRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

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
    fetchTeacherRequests();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTeacherRequests = async () => {
    try {
      const { data } = await supabase
        .from('survey_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setTeacherRequests(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const fetchCloudHistory = async () => {
    try {
      const { data } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setCloudInspections(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSelectRequest = (reqId) => {
    setSelectedRequestId(reqId);
    if (!reqId) {
      setSelectedRequest(null);
      return;
    }
    const found = teacherRequests.find(r => r.id === reqId || r.id === Number(reqId));
    if (found) {
      setSelectedRequest(found);
      setFacilityName(found.facility_name);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationMsg('Trình duyệt không hỗ trợ Geolocation API');
      return;
    }
    setLocating(true);
    setLocationMsg('Đang quét tín hiệu GPS vệ tinh...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationMsg('Đã xác định tọa độ GPS thành công!');
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationMsg('Không thể lấy vị trí GPS. Vui lòng cho phép quyền truy cập vị trí!');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      request_id: selectedRequestId || null,
      user_id: user.id,
      user_email: user.email,
      facility_name: facilityName,
      description,
      status,
      image_url: imageUrl,
      latitude,
      longitude,
      created_at: new Date().toISOString()
    };

    try {
      if (!navigator.onLine) {
        await db.offline_inspections.add(payload);
        setSuccessMsg('Đang offline - Dữ liệu kèm tọa độ GPS đã lưu tạm vào bộ nhớ thiết bị!');
      } else {
        await supabase.from('inspections').insert([payload]);
        setSuccessMsg('Gửi báo cáo khảo sát thành công lên Cloud!');
        fetchCloudHistory();
      }
    } catch (err) {
      await db.offline_inspections.add(payload);
      setSuccessMsg('Đã lưu dữ liệu khảo sát vào bộ nhớ tạm (Dexie.js)!');
    }

    setFacilityName('');
    setDescription('');
    setStatus('good');
    setImageUrl('');
    setSelectedRequestId('');
    setSelectedRequest(null);
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

      {teacherRequests.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-6 rounded-2xl shadow-md">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
            <ClipboardList size={20} className="text-amber-400" /> Yêu cầu Khảo sát từ Giảng viên
          </h3>
          <p className="text-blue-100 text-xs mb-4">Chọn một yêu cầu khảo sát do Giảng viên phát hành để tiến hành đánh giá:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {teacherRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => handleSelectRequest(req.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedRequestId === req.id
                    ? 'bg-white text-blue-950 border-amber-400 font-semibold shadow'
                    : 'bg-blue-800/60 text-blue-50 border-blue-700 hover:bg-blue-800'
                }`}
              >
                <h4 className="font-bold text-sm">{req.title}</h4>
                <p className="text-xs opacity-90 mt-1">Vị trí: {req.facility_name}</p>
                {Array.isArray(req.categories) && req.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {req.categories.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] rounded font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Tạo Phiếu Khảo sát & Đánh giá Tình trạng</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên Cơ sở Vật chất / Vị trí khảo sát</label>
            <input
              type="text"
              required
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Ví dụ: Khu B - Phòng máy B102"
            />
          </div>

          {selectedRequest && Array.isArray(selectedRequest.categories) && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-blue-900 uppercase">Hạng mục Giảng viên yêu cầu kiểm tra:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedRequest.categories.map((cat, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white text-blue-900 border border-blue-300 text-xs rounded-lg font-semibold shadow-sm">
                    ✓ {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Định vị GPS Tọa độ Hiện tại</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Navigation size={14} className={locating ? 'animate-spin' : ''} />
                {locating ? 'Đang định vị GPS...' : '📍 Lấy vị trí GPS hiện tại'}
              </button>
              {latitude && longitude && (
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1 hover:underline"
                >
                  <MapPin size={14} /> {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                </a>
              )}
            </div>
            {locationMsg && <p className="text-xs text-slate-500 mt-1">{locationMsg}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả tình trạng chi tiết</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="Mô tả chi tiết tình trạng các hạng mục (máy tính, bàn ghế, thiết bị điện...)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tình trạng đánh giá tổng thể</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
            >
              <option value="good">🟢 Hoạt động tốt</option>
              <option value="maintenance">🟡 Cần bảo trì</option>
              <option value="danger">🔴 Hỏng hóc / Nguy hiểm</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh chụp minh chứng hiện trường</label>
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
            {submitting ? 'Đang gửi...' : 'Gửi Khảo sát cho Giảng viên'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History size={20} /> Lịch sử Khảo sát Cá nhân
        </h3>

        {offlineInspections?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Đang lưu tạm thiết bị (Dexie.js Queue)</h4>
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
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                  {item.latitude && item.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 font-semibold flex items-center gap-0.5 hover:underline"
                    >
                      <MapPin size={12} /> {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                    </a>
                  )}
                </div>
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

