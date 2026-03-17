import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { skillsAPI } from '../api';
import { BookOpen, User, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Check, AlertTriangle, CreditCard, ShoppingCart } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '', full_name: '', email: '', password: '', confirm_password: '',
    institution: '', programme: '', year_of_study: '',
    bio: '', hourly_rate: '', skill_ids: [],
  });
  const [errors, setErrors] = useState({});
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: () => skillsAPI.getAll().then(r => r.data) });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  const isStudentEmail = formData.email.toLowerCase().endsWith('.edu.gh');

  const validateStep1 = () => {
    if (!formData.role) { setErrors({ role: 'Please select a role' }); return false; }
    return true;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.full_name.trim()) errs.full_name = 'Full name is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Valid email is required';
    if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirm_password) errs.confirm_password = 'Passwords do not match';
    if (!formData.institution.trim()) errs.institution = 'Institution is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // Check if non-student email — show payment step
      if (!isStudentEmail) {
        setShowPayment(true);
        return;
      }
      if (formData.role === 'student' || formData.role === 'buyer') {
        handleSubmit();
      } else {
        setStep(3);
      }
    }
  };

  const handlePaymentAndContinue = async () => {
    setPaymentProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPaymentProcessing(false);
    setShowPayment(false);

    const paymentRef = `ACCESS-${Date.now()}`;
    if (formData.role === 'student' || formData.role === 'buyer') {
      handleSubmit(paymentRef);
    } else {
      // Store the payment reference and move to step 3
      setFormData(prev => ({ ...prev, access_fee_reference: paymentRef }));
      setStep(3);
    }
  };

  const handleSubmit = async (paymentRef) => {
    try {
      await register({
        ...formData,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 50,
        access_fee_reference: paymentRef || formData.access_fee_reference || undefined,
      });
      addToast('Account created successfully! Welcome to SkillBridge.');
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.requires_payment) {
        setShowPayment(true);
        return;
      }
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      addToast(msg, 'error');
    }
  };

  const roles = [
    { value: 'student', icon: GraduationCap, title: 'Student', desc: 'I want to book tutoring sessions and learn new skills' },
    { value: 'tutor', icon: Briefcase, title: 'Tutor', desc: 'I want to teach my skills and earn money' },
    { value: 'both', icon: User, title: 'Both', desc: 'I want to learn and teach on the platform' },
    { value: 'buyer', icon: ShoppingCart, title: 'Buyer', desc: 'I want to hire freelancers for projects (no university email needed)' },
  ];

  return (
    <div className="min-h-[80vh] flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-2/5 relative">
        <img
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1000&q=80"
          alt="Students in classroom"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-red-brand/80 via-orange-brand/40 to-primary/30" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="font-display font-bold text-3xl">Join SkillBridge Today</h2>
          <p className="text-white/80 mt-2">Start learning or teaching tech skills with fellow students.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-red-brand to-orange-brand rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-primary">Skill<span className="text-red-brand">Bridge</span></span>
            </Link>
            <h1 className="font-display font-bold text-2xl text-text-main">Create Your Account</h1>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${step >= s ? 'bg-gradient-to-r from-red-brand to-orange-brand' : 'bg-gray-200'}`} />
                <p className="text-xs text-text-muted mt-1">
                  {s === 1 ? 'Role' : s === 2 ? 'Details' : 'Skills'}
                </p>
              </div>
            ))}
          </div>

          {/* Payment Modal for Non-Student Emails */}
          {showPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowPayment(false)} />
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 bg-red-brand/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-7 w-7 text-red-brand" />
                  </div>
                  <h3 className="font-display font-bold text-lg">Non-Student Email Detected</h3>
                  <p className="text-text-muted text-sm mt-2">
                    SkillBridge is designed for university students. Since <strong>{formData.email}</strong> is not a <code>.edu.gh</code> email, a one-time access fee is required.
                  </p>
                </div>

                <div className="bg-orange-soft rounded-xl p-4 mb-4 border border-orange-brand/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">One-Time Access Fee</span>
                    <span className="font-display font-bold text-xl text-red-brand">GHS 50.00</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  {['mtn_momo', 'vodafone_cash', 'card'].map(m => (
                    <label key={m} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === m ? 'border-red-brand bg-red-brand/5' : 'border-border hover:border-red-brand/30'}`}>
                      <input type="radio" name="pay-method" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} className="text-red-brand" />
                      <CreditCard className="h-4 w-4 text-text-muted" />
                      <span className="text-sm">{m === 'mtn_momo' ? 'MTN MoMo' : m === 'vodafone_cash' ? 'Vodafone Cash' : 'Card Payment'}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={handlePaymentAndContinue} disabled={paymentProcessing} className="flex-1 bg-gradient-to-r from-red-brand to-orange-brand text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    {paymentProcessing ? 'Processing...' : 'Pay GHS 50 & Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display font-semibold text-lg">I want to join as a...</h2>
                <div className="space-y-3">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      onClick={() => updateField('role', role.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        formData.role === role.value ? 'border-red-brand bg-red-brand/5' : 'border-border hover:border-orange-brand/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === role.value ? 'bg-gradient-to-br from-red-brand to-orange-brand text-white' : 'bg-gray-100 text-text-muted'}`}>
                        <role.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{role.title}</p>
                        <p className="text-text-muted text-sm">{role.desc}</p>
                      </div>
                      {formData.role === role.value && <Check className="h-5 w-5 text-red-brand" />}
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-danger text-sm">{errors.role}</p>}
              </div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display font-semibold text-lg">Your Details</h2>
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input type="text" value={formData.full_name} onChange={e => updateField('full_name', e.target.value)} className="input-field" placeholder="e.g. Kwame Asante" />
                  {errors.full_name && <p className="text-danger text-xs mt-1">{errors.full_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} className="input-field" placeholder="e.g. kwame@university.edu.gh" />
                  {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                  {formData.email && !isStudentEmail && formData.email.includes('@') && (
                    <p className="text-orange-brand text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Non-student email. A one-time access fee of GHS 50 will be required.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input type="password" value={formData.password} onChange={e => updateField('password', e.target.value)} className="input-field" placeholder="Min 6 characters" />
                    {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input type="password" value={formData.confirm_password} onChange={e => updateField('confirm_password', e.target.value)} className="input-field" />
                    {errors.confirm_password && <p className="text-danger text-xs mt-1">{errors.confirm_password}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Institution</label>
                  <input type="text" value={formData.institution} onChange={e => updateField('institution', e.target.value)} className="input-field" placeholder="e.g. University of Ghana" />
                  {errors.institution && <p className="text-danger text-xs mt-1">{errors.institution}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Programme</label>
                    <input type="text" value={formData.programme} onChange={e => updateField('programme', e.target.value)} className="input-field" placeholder="e.g. Computer Science" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Year of Study</label>
                    <select value={formData.year_of_study} onChange={e => updateField('year_of_study', e.target.value)} className="input-field">
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Tutor Skills */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-display font-semibold text-lg">Your Teaching Skills</h2>
                <div>
                  <label className="block text-sm font-medium mb-2">Select skills you can teach</label>
                  <div className="space-y-2">
                    {skills?.map(skill => (
                      <label key={skill.skill_id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.skill_ids.includes(skill.skill_id) ? 'border-orange-brand bg-orange-soft' : 'border-border hover:border-orange-brand/30'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.skill_ids.includes(skill.skill_id)}
                          onChange={e => {
                            if (e.target.checked) {
                              updateField('skill_ids', [...formData.skill_ids, skill.skill_id]);
                            } else {
                              updateField('skill_ids', formData.skill_ids.filter(id => id !== skill.skill_id));
                            }
                          }}
                          className="rounded text-orange-brand"
                        />
                        <span className="text-sm">{skill.skill_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hourly Rate (GHS)</label>
                  <input type="number" value={formData.hourly_rate} onChange={e => updateField('hourly_rate', e.target.value)} className="input-field" placeholder="e.g. 50" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bio</label>
                  <textarea value={formData.bio} onChange={e => updateField('bio', e.target.value)} className="input-field" rows={3} placeholder="Tell students about your experience..." />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-text-muted hover:text-text-main font-medium">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : <div />}
              {step < 3 || formData.role === 'student' || formData.role === 'buyer' ? (
                <button onClick={handleNext} className="bg-gradient-to-r from-red-brand to-orange-brand text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
                  {step === 2 && (formData.role === 'student' || formData.role === 'buyer') ? 'Create Account' : 'Next'} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => handleSubmit()} className="bg-gradient-to-r from-red-brand to-orange-brand text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-1">
                  Create Account <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-text-muted text-sm mt-6">
            Already have an account? <Link to="/login" className="text-red-brand font-medium hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
