import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, ChevronDown, ChevronUp, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import api from '../api';

const FAQS = [
  { q: 'How do I book a tutoring session?', a: 'Browse tutors from the catalog, select one, choose an available time slot, and confirm your booking. The session fee will be deducted from your wallet.' },
  { q: 'How does the payment system work?', a: 'SkillBridge uses a digital wallet system. Top up your wallet using MTN MoMo, Vodafone Cash, or card. When you book a session, the fee is deducted from your wallet balance.' },
  { q: 'What is the platform commission?', a: 'SkillBridge charges a 10% commission on every completed session. This means tutors receive 90% of the session fee.' },
  { q: 'How do I become a tutor?', a: 'Register as a tutor (or both student and tutor), select your skills, set your hourly rate, and create your availability schedule. Students can then book sessions with you.' },
  { q: 'How do I withdraw my earnings?', a: 'Go to your Wallet page and use the Withdraw section. You can withdraw to MTN MoMo, Vodafone Cash, or bank transfer.' },
  { q: 'What happens if I cancel a booking?', a: 'If you cancel more than 24 hours before the session, you get a full refund. If less than 24 hours, you receive a 50% refund.' },
  { q: 'Can I request a skill that is not listed?', a: 'Yes! Use the "Request a New Skill" feature on the Browse page. Our admin team will review your request and add the skill if appropriate.' },
  { q: 'How do I rate my tutor?', a: 'After a session is marked as completed, you\'ll see a "Leave Review" button on your bookings page. Rate your tutor from 1-5 stars and add an optional text review.' },
];

export default function Support() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [disputeForm, setDisputeForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    subject: 'Dispute',
    message: '',
  });
  const [activeTab, setActiveTab] = useState('faq');

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      // Just simulate — log to console
      console.log('Support ticket:', contactForm);
      addToast('Message sent! We\'ll get back to you soon.');
      setContactForm(prev => ({ ...prev, subject: '', message: '' }));
    } catch {
      addToast('Failed to send message', 'error');
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    console.log('Dispute:', disputeForm);
    addToast('Dispute submitted. We\'ll investigate and get back to you.');
    setDisputeForm(prev => ({ ...prev, message: '' }));
  };

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-brand via-red-brand to-orange-brand/80">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="font-display font-bold text-3xl text-white">Help & Support</h1>
          <p className="text-white/70 mt-2">Find answers or reach out to our team</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-100 rounded-lg p-1 max-w-md mx-auto">
          {[
            { id: 'faq', label: 'FAQ', icon: HelpCircle },
            { id: 'contact', label: 'Contact', icon: MessageSquare },
            { id: 'dispute', label: 'Dispute', icon: AlertTriangle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-red-brand shadow-sm' : 'text-text-muted hover:text-text-main'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 text-left hover:bg-orange-soft transition-colors"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-orange-brand" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-muted" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-text-muted text-sm border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contact Form */}
        {activeTab === 'contact' && (
          <div className="card max-w-lg mx-auto">
            <h2 className="font-display font-semibold text-lg mb-4">Contact Us</h2>
            <form onSubmit={handleContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} className="input-field" required>
                  <option value="">Select subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing/Payment</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} className="input-field" rows={4} required placeholder="Describe your issue or question..." />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Send Message
              </button>
            </form>
          </div>
        )}

        {/* Dispute Form */}
        {activeTab === 'dispute' && (
          <div className="card max-w-lg mx-auto">
            <h2 className="font-display font-semibold text-lg mb-2">Submit a Dispute</h2>
            <p className="text-text-muted text-sm mb-4">If you have an issue with a session, payment, or another user, submit a dispute and our team will investigate.</p>
            <form onSubmit={handleDispute} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" value={disputeForm.name} onChange={e => setDisputeForm(p => ({ ...p, name: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={disputeForm.email} onChange={e => setDisputeForm(p => ({ ...p, email: e.target.value }))} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Describe the Issue</label>
                <textarea value={disputeForm.message} onChange={e => setDisputeForm(p => ({ ...p, message: e.target.value }))} className="input-field" rows={5} required placeholder="Please include booking ID if applicable, what happened, and what resolution you're seeking..." />
              </div>
              <button type="submit" className="bg-gradient-to-r from-red-brand to-orange-brand text-white w-full px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Submit Dispute
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
