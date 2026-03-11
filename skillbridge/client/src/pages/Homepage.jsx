import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, skillsAPI } from '../api';
import TutorCard from '../components/TutorCard';
import Loader from '../components/Loader';
import { ArrowRight, Search, Calendar, CreditCard, GraduationCap, Code, BarChart3, Palette, Database, Shield, Smartphone, Camera, Film, Star } from 'lucide-react';

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
      <section className="bg-gradient-to-br from-primary via-primary to-sidebar text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight">
              Find a Peer Tutor for <span className="text-accent">Any Tech Skill</span>
            </h1>
            <p className="text-lg text-white/80 mt-6 max-w-2xl">
              Connect with fellow students who excel in tech skills. Book one-on-one tutoring sessions, learn at your pace, and pay securely with your digital wallet.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/browse" className="btn-accent inline-flex items-center gap-2 text-lg px-8 py-3">
                Browse Tutors <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/register" className="bg-white/10 text-white px-8 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors text-lg">
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
              <p className="font-display font-bold text-3xl sm:text-4xl text-accent">{stats?.sessions || 0}+</p>
              <p className="text-text-muted mt-1">Sessions Completed</p>
            </div>
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-success">{stats?.students || 0}+</p>
              <p className="text-text-muted mt-1">Students Helped</p>
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
          {skills?.map(skill => {
            const Icon = SKILL_ICONS[skill.skill_name] || Code;
            return (
              <Link
                key={skill.skill_id}
                to={`/browse?skill=${skill.skill_id}`}
                className="card flex items-center gap-4 hover:shadow-md hover:border-primary-light transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
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
            <Link to="/browse" className="hidden sm:inline-flex items-center gap-1 text-primary font-medium hover:text-primary-light">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-3xl text-text-main">How It Works</h2>
          <p className="text-text-muted mt-2">Get started in 4 simple steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: 1, icon: Search, title: 'Browse', desc: 'Search and filter tutors by skill, price, and rating' },
            { step: 2, icon: Calendar, title: 'Book', desc: 'Pick an available time slot and book your session' },
            { step: 3, icon: CreditCard, title: 'Pay', desc: 'Pay securely from your digital wallet' },
            { step: 4, icon: GraduationCap, title: 'Learn', desc: 'Join your session and master the skill' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-sm">
                {item.step}
              </div>
              <h3 className="font-display font-semibold text-lg">{item.title}</h3>
              <p className="text-text-muted text-sm mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display font-bold text-3xl text-text-main">What Students Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="card">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }, (_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
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
      <section className="bg-gradient-to-r from-accent to-accent-light py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-display font-bold text-3xl">Ready to Start Learning?</h2>
          <p className="text-white/80 mt-3 text-lg">Join hundreds of students already improving their tech skills with SkillBridge</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/register" className="bg-white text-accent px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
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
