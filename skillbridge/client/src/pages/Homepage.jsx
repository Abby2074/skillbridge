import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, skillsAPI } from '../api';
import TutorCard from '../components/TutorCard';
import Loader from '../components/Loader';
import { ArrowRight, Search, Calendar, CreditCard, GraduationCap, Code, BarChart3, Palette, Database, Shield, Smartphone, Camera, Film, Star, Flame, Zap, TrendingUp } from 'lucide-react';

const SKILL_ICONS = {
  'Python Programming': Code,
  'Web Development (HTML, CSS, JavaScript)': Code,
  'Data Analysis (Microsoft Excel, Power BI, Google Sheets)': BarChart3,
  'Graphic Design (Canva, Adobe Photoshop, Figma)': Palette,
  'Database Design and SQL': Database,
  'Video Editing (Adobe Premiere Pro, CapCut)': Film,
  'Photography Editing (Adobe Lightroom, Adobe Photoshop)': Camera,
  'Cybersecurity Fundamentals': Shield,
  'Mobile Application Development': Smartphone,
};

export default function Homepage() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => usersAPI.getStats().then(r => r.data) });
  const { data: tutors, isLoading } = useQuery({ queryKey: ['featured-tutors'], queryFn: () => usersAPI.getTutors({ sort: 'rating' }).then(r => r.data) });
  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: () => skillsAPI.getAll().then(r => r.data) });

  const testimonials = [
    { name: 'Ama K.', text: 'SkillBridge helped me ace my Python exam! My tutor was incredibly patient and knowledgeable.', rating: 5, institution: 'University of Ghana' },
    { name: 'Kofi M.', text: 'I went from zero to building my first website in just 3 sessions. Best investment I made this semester.', rating: 5, institution: 'KNUST' },
    { name: 'Efua D.', text: 'The platform is so easy to use and the tutors are all students who actually understand your struggles.', rating: 5, institution: 'Ashesi University' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80"
            alt="Students collaborating"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-red-brand/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-6">
              <Flame className="h-4 w-4 text-orange-light" />
              <span>Trusted by students across Ghana</span>
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight text-white">
              Find a Peer Tutor for <span className="text-orange-light">Any Tech Skill</span>
            </h1>
            <p className="text-lg text-white/80 mt-6 max-w-2xl">
              Connect with fellow students who excel in tech skills. Book one-on-one tutoring sessions, learn at your pace, and pay securely with your digital wallet.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/browse" className="bg-gradient-to-r from-accent to-orange-brand text-white inline-flex items-center gap-2 text-lg px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg shadow-orange-brand/30">
                Browse Tutors <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/register" className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors text-lg border border-white/20">
                Become a Tutor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-primary">{stats?.tutors || 0}+</p>
              <p className="text-text-muted mt-1">Active Tutors</p>
            </div>
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-orange-brand">{stats?.sessions || 0}+</p>
              <p className="text-text-muted mt-1">Sessions Completed</p>
            </div>
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-red-brand">{stats?.students || 0}+</p>
              <p className="text-text-muted mt-1">Students Helped</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image Banner */}
      <section className="bg-gradient-to-r from-orange-soft via-red-50 to-orange-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-red-brand font-medium text-sm mb-3">
                <Zap className="h-4 w-4" /> Why SkillBridge?
              </div>
              <h2 className="font-display font-bold text-3xl text-text-main">Learn From Students Who <span className="text-red-brand">Get It</span></h2>
              <p className="text-text-muted mt-3 leading-relaxed">
                Traditional tutoring can feel intimidating. SkillBridge connects you with peer tutors who recently mastered the same courses you're taking. They understand your struggles and speak your language.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-brand/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-red-brand" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Affordable rates set by student tutors</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-brand/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-orange-brand" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Flexible scheduling around your classes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Secure wallet payments with full refund policy</span>
                </div>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80"
                  alt="Students working together on laptops"
                  className="w-full h-72 object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-brand flex items-center justify-center">
                    <Star className="h-4 w-4 text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-main">4.9 Average</p>
                    <p className="text-xs text-text-muted">Tutor Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skill Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl text-text-main">Explore Skill Categories</h2>
          <p className="text-text-muted mt-2">Find expert peer tutors across 9 in-demand tech skills</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills?.map((skill, index) => {
            const Icon = SKILL_ICONS[skill.skill_name] || Code;
            const isOrange = index % 3 === 0;
            const isRed = index % 3 === 1;
            return (
              <Link
                key={skill.skill_id}
                to={`/browse?skill=${skill.skill_id}`}
                className="card flex items-center gap-4 hover:shadow-md hover:border-orange-light/50 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  isOrange ? 'bg-orange-brand/10 group-hover:bg-orange-brand/20' :
                  isRed ? 'bg-red-brand/10 group-hover:bg-red-brand/20' :
                  'bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    isOrange ? 'text-orange-brand' :
                    isRed ? 'text-red-brand' :
                    'text-primary'
                  }`} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-text-main group-hover:text-primary transition-colors">
                    {skill.skill_name.split('(')[0].trim()}
                  </h3>
                  <p className="text-text-muted text-sm">{skill.category}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Tutors */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display font-bold text-3xl text-text-main">Top-Rated Tutors</h2>
              <p className="text-text-muted mt-2">Learn from our highest-rated peer tutors</p>
            </div>
            <Link to="/browse" className="hidden sm:inline-flex items-center gap-1 text-red-brand font-medium hover:text-red-light">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? <Loader /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutors?.slice(0, 6).map(tutor => (
                <TutorCard key={tutor.listing_id} tutor={tutor} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-soft via-white to-red-50/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-text-main">How It Works</h2>
            <p className="text-text-muted mt-2">Get started in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: 1, icon: Search, title: 'Browse', desc: 'Search and filter tutors by skill, price, and rating', color: 'text-primary', bg: 'bg-primary/10' },
              { step: 2, icon: Calendar, title: 'Book', desc: 'Pick an available time slot and book your session', color: 'text-orange-brand', bg: 'bg-orange-brand/10' },
              { step: 3, icon: CreditCard, title: 'Pay', desc: 'Pay securely from your digital wallet', color: 'text-red-brand', bg: 'bg-red-brand/10' },
              { step: 4, icon: GraduationCap, title: 'Learn', desc: 'Join your session and master the skill', color: 'text-accent', bg: 'bg-accent/10' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className={`w-16 h-16 ${item.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-red-brand to-orange-brand rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="font-display font-semibold text-lg">{item.title}</h3>
                <p className="text-text-muted text-sm mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutoring Image Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"
                  alt="Online tutoring session"
                  className="w-full h-80 object-cover"
                />
              </div>
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-red-brand to-orange-brand rounded-xl flex items-center justify-center shadow-lg">
                <Flame className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h2 className="font-display font-bold text-3xl text-text-main">Online & In-Person <span className="text-orange-brand">Sessions</span></h2>
              <p className="text-text-muted mt-3 leading-relaxed">
                Choose how you want to learn. Join video sessions from anywhere or meet your tutor on campus. Either way, you get personalized, one-on-one attention.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-orange-soft rounded-xl p-4 border border-orange-brand/10">
                  <p className="font-display font-bold text-2xl text-orange-brand">9+</p>
                  <p className="text-text-muted text-sm">Tech Skills Available</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-brand/10">
                  <p className="font-display font-bold text-2xl text-red-brand">24/7</p>
                  <p className="text-text-muted text-sm">Online Availability</p>
                </div>
              </div>
              <Link to="/browse" className="inline-flex items-center gap-2 mt-6 text-red-brand font-medium hover:text-red-light transition-colors">
                Start Learning Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-br from-orange-soft via-white to-red-50/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-bold text-3xl text-text-main">What Students Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="card hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }, (_, j) => (
                    <Star key={j} className="h-4 w-4 fill-orange-brand text-orange-brand" />
                  ))}
                </div>
                <p className="text-text-main italic">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-text-muted text-xs">{t.institution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&q=80"
            alt="Students celebrating"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-red-brand/90 via-orange-brand/85 to-accent/80" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white py-20">
          <h2 className="font-display font-bold text-3xl sm:text-4xl">Ready to Start Learning?</h2>
          <p className="text-white/80 mt-3 text-lg">Join hundreds of students already improving their tech skills with SkillBridge</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/register" className="bg-white text-red-brand px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Get Started Free
            </Link>
            <Link to="/browse" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Browse Tutors
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
