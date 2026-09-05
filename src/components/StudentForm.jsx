import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Send, WifiOff, History, CheckCircle, MapPin, ClipboardList, Navigation, ArrowLeft, PlusCircle } from 'lucide-react';

export default function StudentForm({ user }) {
  const [activeView, setActiveView] = useState('list');
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
  const [previewImage, setPreviewImage] = useState(null);

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

    const channel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('vku_survey_sync_channel') : null;
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'REQUEST_ADDED' || event.data?.type === 'REQUEST_DELETED') {
          fetchTeacherRequests();
        }
        if (event.data?.type === 'INSPECTION_ADDED' || event.data?.type === 'INSPECTION_DELETED') {
          fetchCloudHistory();
        }
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (channel) channel.close();
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

  const handleStartSurvey = (req) => {
    if (req) {
      setSelectedRequest(req);
      setSelectedRequestId(req.id);
      setFacilityName(req.facility_name || '');
    } else {
      setSelectedRequest(null);
      setSelectedRequestId('');
      setFacilityName('');
    }
    setDescription('');
    setStatus('good');
    setImageUrl('');
    setLatitude(null);
    setLongitude(null);
    setLocationMsg('');
    setActiveView('form');
  };

  const handleBackToList = () => {
    setActiveView('list');
    setSelectedRequest(null);
    setSelectedRequestId('');
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
        setLocationMsg('Không thể lấy vị trí GPS. Vui lòng bật vị trí thiết bị!');
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
        setSuccessMsg('Đang offline - Khảo sát đã lưu tạm vào bộ nhớ thiết bị!');
      } else {
        await supabase.from('inspections').insert([payload]);
        setSuccessMsg('Gửi báo cáo khảo sát thành công cho Giảng viên!');
        fetchCloudHistory();
      }
    } catch (err) {
      await db.offline_inspections.add(payload);
      setSuccessMsg('Đã lưu dữ liệu khảo sát vào bộ nhớ bộ đệm!');
    }

    setFacilityName('');
    setDescription('');
    setStatus('good');
    setImageUrl('');
    setSelectedRequestId('');
    setSelectedRequest(null);
    setSubmitting(false);
    setActiveView('list');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!onlineStatus && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-xl flex items-center gap-3">
          <WifiOff size={20} className="text-amber-600" />
          <span className="font-medium text-sm">Đang chế độ Offline - Dữ liệu khảo sát sẽ được lưu tạm thiết bị</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}

      {activeView === 'list' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={24} className="text-blue-900" />
                  Danh sách Yêu cầu Khảo sát từ Giảng viên
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn một phiếu khảo sát dưới đây để bắt đầu thực hiện kiểm tra và đánh giá
                </p>
              </div>
              <button
                onClick={() => handleStartSurvey(null)}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow transition"
              >
                <PlusCircle size={16} /> Khảo sát Tự chọn
              </button>
            </div>

            {teacherRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm italic mb-3">Hiện chưa có yêu cầu khảo sát mới từ Giảng viên.</p>
                <button
                  onClick={() => handleStartSurvey(null)}
                  className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg shadow"
                >
                  ➕ Tạo Khảo sát Cơ sở Vật chất Tự chọn
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {teacherRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-blue-100 hover:border-blue-300 transition shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-900 text-base">{req.title}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] rounded font-bold uppercase">
                          Yêu cầu
                        </span>
                      </div>
                      <p className="text-xs text-blue-950 font-semibold mt-1">📍 Vị trí: {req.facility_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Giảng viên: {req.teacher_email}</p>

                      {Array.isArray(req.categories) && req.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {req.categories.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-blue-200 text-blue-900 text-xs rounded font-medium shadow-2xs">
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartSurvey(req)}
                      className="mt-4 w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow transition flex items-center justify-center gap-1.5"
                    >
                      📝 Thực hiện Khảo sát này
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <History size={20} className="text-slate-700" /> Lịch sử Khảo sát Đã Nộp
            </h3>

            {offlineInspections?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Đang lưu tạm thiết bị (Offline Queue)</h4>
                <div className="space-y-2">
                  {offlineInspections.map((item) => (
                    <div key={item.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-sm">
                      <div>
                        <span className="font-semibold text-slate-800">{item.facility_name}</span>
                        <p className="text-slate-500 text-xs">{item.description}</p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-medium">Chưa đồng bộ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cloudInspections.length === 0 && (!offlineInspections || offlineInspections.length === 0) ? (
              <p className="text-sm text-slate-500 italic p-4 text-center">Bạn chưa thực hiện bài khảo sát nào.</p>
            ) : (
              <div className="space-y-3">
                {cloudInspections.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900">{item.facility_name}</h4>
                      </div>
                      <p className="text-slate-700 text-xs">{item.description}</p>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString('vi-VN')}</span>
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
                        {item.image_url && (
                          <button
                            onClick={() => setPreviewImage(item.image_url)}
                            className="text-xs text-blue-700 font-semibold hover:underline"
                          >
                            🖼️ Xem ảnh
                          </button>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      item.status === 'good' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status === 'good' ? 'Tốt 🟢' : item.status === 'maintenance' ? 'Bảo trì 🟡' : 'Hỏng 🔴'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <button
              onClick={handleBackToList}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <ArrowLeft size={16} /> Quay lại Danh sách Yêu cầu
            </button>
            <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {selectedRequest ? 'Phiếu Khảo sát theo Yêu cầu' : 'Phiếu Khảo sát Tự chọn'}
            </span>
          </div>

          {selectedRequest && (
            <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl space-y-2">
              <h3 className="font-bold text-base">{selectedRequest.title}</h3>
              <p className="text-xs text-blue-100">Cơ sở vật chất chỉ định: <span className="font-semibold text-amber-300">{selectedRequest.facility_name}</span></p>
              {Array.isArray(selectedRequest.categories) && selectedRequest.categories.length > 0 && (
                <div className="mt-2">
                  <span className="text-[11px] text-blue-200 block mb-1">Các hạng mục Giảng viên yêu cầu kiểm tra:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRequest.categories.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white/20 text-white text-xs rounded-lg font-medium">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả tình trạng chi tiết các hạng mục</label>
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
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="bg-white p-4 rounded-2xl max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-slate-800 mb-2">Ảnh Minh chứng Khảo sát</h4>
            <img src={previewImage} alt="Evidence" className="w-full max-h-96 object-contain rounded-xl border" />
            <button
              onClick={() => setPreviewImage(null)}
              className="mt-4 w-full bg-slate-800 text-white font-medium py-2 rounded-xl text-sm"
            >
              Đóng Xem Ảnh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
