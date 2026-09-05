import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LayoutDashboard, Trash2, Search, Filter, RefreshCw } from 'lucide-react';

export default function TeacherDashboard() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAllInspections();
  }, []);

  const fetchAllInspections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setInspections(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc muốn xóa bản ghi này trên máy chủ Cloud?')) {
      await supabase.from('inspections').delete().eq('id', id);
      fetchAllInspections();
    }
  };

  const filteredInspections = inspections.filter((item) => {
    const matchesSearch = item.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = inspections.length;
  const goodCount = inspections.filter((i) => i.status === 'good').length;
  const mainCount = inspections.filter((i) => i.status === 'maintenance').length;
  const dangerCount = inspections.filter((i) => i.status === 'danger').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard size={24} className="text-blue-900" />
            Dashboard Giảng viên - VKU Field Survey
          </h2>
          <p className="text-slate-500 text-sm">Xem toàn bộ khảo sát cơ sở vật chất từ học sinh / sinh viên</p>
        </div>
        <button
          onClick={fetchAllInspections}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition"
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-xs text-slate-500 font-semibold uppercase">Tổng số phiếu</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{total}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm text-center">
          <span className="text-xs text-emerald-700 font-semibold uppercase">Tốt 🟢</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{goodCount}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm text-center">
          <span className="text-xs text-amber-700 font-semibold uppercase">Bảo trì 🟡</span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{mainCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm text-center">
          <span className="text-xs text-red-700 font-semibold uppercase">Hỏng hóc 🔴</span>
          <p className="text-2xl font-bold text-red-800 mt-1">{dangerCount}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên vị trí hoặc email học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="good">Hoạt động tốt</option>
            <option value="maintenance">Cần bảo trì</option>
            <option value="danger">Hỏng hóc / Nguy hiểm</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải dữ liệu từ Cloud...</div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không tìm thấy bản ghi khảo sát nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <th className="p-4">Cơ sở vật chất</th>
                  <th className="p-4">Sinh viên báo cáo</th>
                  <th className="p-4">Mô tả chi tiết</th>
                  <th className="p-4">Đánh giá</th>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredInspections.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-4 font-semibold text-slate-900">{item.facility_name}</td>
                    <td className="p-4 text-slate-600">{item.user_email}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'good' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'good' ? 'Tốt' : item.status === 'maintenance' ? 'Bảo trì' : 'Hỏng'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
