import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ContactPage: React.FC = () => {
  const { settings } = useStoreSettings();
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate inquiry dispatch to business email
    setSubmitted(true);
    setFormName('');
    setFormEmail('');
    setFormSubject('');
    setFormMessage('');
  };

  const whatsappInquiryUrl = `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(
    'Hello Kainath! I have an enquiry regarding Aura Fashion.'
  )}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#832729]">Get in Touch</p>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900">
          Contact Aura Fashion
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto">
          We are based in Bengaluru, Karnataka. Reach out directly for bespoke sizing, order tracking, or styling advice.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Contact Info Cards */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-6">
            <h2 className="font-serif text-xl font-bold text-stone-900 pb-3 border-b border-stone-100">
              Studio Information
            </h2>

            <div className="space-y-5 text-sm">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Location</h4>
                  <p className="text-stone-600 text-xs mt-0.5">{settings.shopAddress}, {settings.shopLocation}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Direct Phone</h4>
                  <p className="text-stone-600 text-xs mt-0.5">
                    <a href={`tel:${settings.contactNumber}`} className="hover:text-[#832729]">
                      +91 {settings.contactNumber}
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Business Email</h4>
                  <p className="text-stone-600 text-xs mt-0.5">
                    <a href={`mailto:${settings.email}`} className="hover:text-[#832729]">
                      {settings.email}
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Studio Hours</h4>
                  <p className="text-stone-600 text-xs mt-0.5">{settings.businessHours}</p>
                </div>
              </div>
            </div>

            {/* Quick WhatsApp Connect */}
            <div className="pt-4 border-t border-stone-100">
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" /> Instant WhatsApp Connect (+91 {settings.whatsappNumber})
              </a>
            </div>
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Send an Inquiry</h2>

          {submitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-serif text-base font-bold text-emerald-900">Inquiry Received</h3>
              <p className="text-xs text-emerald-700">
                Thank you! Our team will reply to your email address promptly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-[#832729] underline pt-2 inline-block"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Subject</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Custom sizing / order enquiry / wholesale"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="How can we assist you with our clothing collection?"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send className="w-4 h-4" /> Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
