import React, { useEffect, useState } from 'react';
import {
  Save,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Bell,
  Send,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { StoreSettings, EmailLog } from '../types';

export const StoreSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Email test & log states
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
        if (res.data.settings?.notifications?.adminNotificationEmail) {
          setTestEmailAddress(res.data.settings.notifications.adminNotificationEmail);
        }
      }
    } catch (err) {
      console.error('Error loading store settings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/settings/email-logs?limit=15');
      if (res.data.success) {
        setEmailLogs(res.data.logs || []);
      }
    } catch (err) {
      console.error('Error loading email logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchEmailLogs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        setSettings(res.data.settings);
        setSuccessMsg('Store settings updated! All customer pages and email triggers reflect changes.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setTestEmailStatus({ type: 'error', message: 'Please enter a valid recipient email address.' });
      return;
    }
    setSendingTestEmail(true);
    setTestEmailStatus(null);

    try {
      const res = await api.post('/settings/test-email', { targetEmail: testEmailAddress });
      if (res.data.success) {
        setTestEmailStatus({
          type: 'success',
          message: res.data.message || 'Test email successfully dispatched!'
        });
        fetchEmailLogs();
      } else {
        setTestEmailStatus({
          type: 'error',
          message: res.data.message || 'Failed to dispatch test email.'
        });
      }
    } catch (err: any) {
      setTestEmailStatus({
        type: 'error',
        message: err.response?.data?.message || 'SMTP Connection Failed. Please verify SMTP settings.'
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const updateNotificationField = (field: string, val: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        orderConfirmationEmail: true,
        paymentConfirmationEmail: true,
        orderStatusEmail: true,
        adminNewOrderAlert: true,
        adminLowStockAlert: true,
        adminOrderCancelledAlert: true,
        adminNotificationEmail: 'shoppe.aurafashion@gmail.com',
        ...(settings.notifications || {}),
        [field]: val
      }
    });
  };

  if (loading || !settings) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading store settings...</div>;
  }

  const notifs = settings.notifications || {
    orderConfirmationEmail: true,
    paymentConfirmationEmail: true,
    orderStatusEmail: true,
    adminNewOrderAlert: true,
    adminLowStockAlert: true,
    adminOrderCancelledAlert: true,
    adminNotificationEmail: 'shoppe.aurafashion@gmail.com'
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Aura Fashion Store Identity & Business Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time configuration for contact details, policies, delivery fees, brand accents, and email notifications.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] transition-all flex items-center gap-1.5 shadow-md shadow-[#832729]/20 self-start sm:self-auto cursor-pointer"
        >
          <Save className="w-4 h-4" /> {saving ? 'Applying...' : 'Save Settings'}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 text-xs">
        {/* Section 1: Business Identity & Owner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b">
            1. Proprietor & Studio Location
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Shop Name</label>
              <input
                type="text"
                required
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Proprietor / Owner Name</label>
              <input
                type="text"
                required
                value={settings.ownerName}
                onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Studio Address</label>
              <input
                type="text"
                required
                value={settings.shopAddress}
                onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Location Details</label>
              <input
                type="text"
                required
                value={settings.shopLocation}
                onChange={(e) => setSettings({ ...settings, shopLocation: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={settings.contactNumber}
                onChange={(e) => setSettings({ ...settings, contactNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">WhatsApp Business Number</label>
              <input
                type="text"
                required
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Email</label>
              <input
                type="email"
                required
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Studio Operating Hours</label>
            <input
              type="text"
              value={settings.businessHours}
              onChange={(e) => setSettings({ ...settings, businessHours: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>
        </div>

        {/* Section 2: Delivery & Shipping Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#832729]" /> 2. Delivery & Cash on Delivery Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Standard Delivery Fee (INR)</label>
              <input
                type="number"
                min={0}
                value={settings.deliveryCharge}
                onChange={(e) => setSettings({ ...settings, deliveryCharge: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Free Delivery Order Threshold (INR)</label>
              <input
                type="number"
                min={0}
                value={settings.freeDeliveryThreshold}
                onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-800">
              <input
                type="checkbox"
                checked={settings.codAvailable}
                onChange={(e) => setSettings({ ...settings, codAvailable: e.target.checked })}
                className="rounded text-[#832729] focus:ring-[#832729]"
              />
              Enable Cash on Delivery (COD) for Customers
            </label>
          </div>
        </div>

        {/* Section 3: Customer Policies */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#832729]" /> 3. Customer Care & Studio Policies
          </h2>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Return Policy</label>
            <textarea
              rows={2}
              value={settings.returnPolicy}
              onChange={(e) => setSettings({ ...settings, returnPolicy: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Exchange Policy</label>
            <textarea
              rows={2}
              value={settings.exchangePolicy}
              onChange={(e) => setSettings({ ...settings, exchangePolicy: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Refund Terms</label>
            <textarea
              rows={2}
              value={settings.refundPolicy}
              onChange={(e) => setSettings({ ...settings, refundPolicy: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>
        </div>

        {/* Section 4: Brand Styling & Banners */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b">
            4. Theme Palette & Header Announcement
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary Theme Color Hex</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Accent Theme Color Hex</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Top Announcement Strip Text</label>
            <input
              type="text"
              value={settings.announcementText}
              onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>
        </div>

        {/* Section 5: Email Notification Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b">
            <h2 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#832729]" /> 5. Automated Email Notification Settings
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              SMTP Active
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Customer Order Lifecycle Emails</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.orderConfirmationEmail}
                    onChange={(e) => updateNotificationField('orderConfirmationEmail', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Order Placed</span>
                    <span className="text-[11px] text-slate-500">Sent immediately upon successful checkout</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.paymentConfirmationEmail}
                    onChange={(e) => updateNotificationField('paymentConfirmationEmail', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Payment Received</span>
                    <span className="text-[11px] text-slate-500">Sent upon Razorpay payment capture</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.orderStatusEmail}
                    onChange={(e) => updateNotificationField('orderStatusEmail', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Status & Shipping</span>
                    <span className="text-[11px] text-slate-500">Dispatched, shipped & delivery updates</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="font-bold text-slate-800 mb-2">Store Administrator Alerts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.adminNewOrderAlert}
                    onChange={(e) => updateNotificationField('adminNewOrderAlert', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">New Order Alert</span>
                    <span className="text-[11px] text-slate-500">Instant notification of incoming sales</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.adminLowStockAlert}
                    onChange={(e) => updateNotificationField('adminLowStockAlert', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Low Stock Alert</span>
                    <span className="text-[11px] text-slate-500">Triggered when any variant reaches &le; 5 units</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={notifs.adminOrderCancelledAlert}
                    onChange={(e) => updateNotificationField('adminOrderCancelledAlert', e.target.checked)}
                    className="mt-0.5 rounded text-[#832729] focus:ring-[#832729]"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">Cancellation Alert</span>
                    <span className="text-[11px] text-slate-500">Alerts when customer cancels an order</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <label className="font-bold text-slate-700 block mb-1">
                Admin Notification Email Recipient
              </label>
              <div className="flex gap-2 max-w-md">
                <input
                  type="email"
                  value={notifs.adminNotificationEmail || ''}
                  onChange={(e) => updateNotificationField('adminNotificationEmail', e.target.value)}
                  placeholder="shoppe.aurafashion@gmail.com"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Admin alerts for new orders, customer cancellations, and low-inventory warnings will be delivered here.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Section 6: SMTP Verification & Test Dispatch */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#832729]" /> 6. SMTP Verification & Live Test Dispatch
        </h2>
        <p className="text-slate-500 text-xs">
          Verify that Brevo SMTP Relay credentials and transmission pipelines are operational by sending a test email.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
          <input
            type="email"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
            placeholder="Enter test recipient email"
            className="flex-1 px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#832729]"
          />
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {sendingTestEmail ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>

        {testEmailStatus && (
          <div
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              testEmailStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testEmailStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testEmailStatus.message}</span>
          </div>
        )}
      </div>

      {/* Section 7: Email Delivery Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <h2 className="font-serif text-base font-bold text-slate-900">
              7. Email Delivery Audit Trail
            </h2>
            <p className="text-[11px] text-slate-500">
              Recent outgoing notification logs, delivery statuses, and retry attempts.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchEmailLogs}
            disabled={loadingLogs}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {emailLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            {loadingLogs ? 'Loading audit logs...' : 'No email delivery logs recorded yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject / Order</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emailLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 text-[11px]">
                      {log.emailType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{log.recipient}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="truncate max-w-[220px]" title={log.subject}>
                        {log.subject}
                      </div>
                      {log.orderNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Order: {log.orderNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : log.status === 'SKIPPED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.errorMessage && (
                        <p className="text-[10px] text-rose-500 truncate max-w-[150px]" title={log.errorMessage}>
                          {log.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                      {log.attempts}
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
};

