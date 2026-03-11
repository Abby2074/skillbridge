import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { skillsAPI } from '../api';
import { BookOpen, User, GraduationCap, Briefcase, ArrowRight, ArrowLeft, Check } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '', full_name: '', email: '', password: '', confirm_password: '',
    institution: '', programme: '', year_of_study: '',
    bio: '', hourly_rate: '', skill_ids: [],
  });
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: () => skillsAPI.getAll().then(r => r.data) });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  };

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
      if (formData.role === 'student') {
        handleSubmit();
      } else {
        setStep(3);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      await register({
        ...formData,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 50,
      });
      addToast('Account created successfully! Welcome to SkillBridge.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      addToast(msg, 'error');
    }
  };

  const roles = [
    { value: 'student', icon: GraduationCap, title: 'Student', desc: 'I want to book tutoring sessions and learn new skills' },
    { value: 'tutor', icon: Briefcase, title: 'Tutor', desc: 'I want to teach my skills and earn money' },
    { value: 'both', icon: User, title: 'Both', desc: 'I want to learn and teach on the platform' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl text-primary">SkillBridge</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-text-main">Create Your Account</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-gray-200'}`} />
              <p className="text-xs text-text-muted mt-1">
                {s === 1 ? 'Role' : s === 2 ? 'Details' : 'Skills'}
              </p>
            </div>
          ))}
        </div>

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
                      formData.role === role.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === role.value ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
                      <role.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{role.title}</p>
                      <p className="text-text-muted text-sm">{role.desc}</p>
                    </div>
                    {formData.role === role.value && <Check className="h-5 w-5 text-primary" />}
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
                      formData.skill_ids.includes(skill.skill_id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
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
                        className="rounded text-primary"
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
            {step < 3 || formData.role === 'student' ? (
              <button onClick={handleNext} className="btn-primary flex items-center gap-1">
                {step === 2 && formData.role === 'student' ? 'Create Account' : 'Next'} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-1">
                Create Account <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
