import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, skillsAPI, gigsAPI } from '../api';
import TutorCard from '../components/TutorCard';
import Loader from '../components/Loader';
import { ArrowRight, Search, Calendar, CreditCard, GraduationCap, Code, BarChart3, Palette, Database, Shield, Smartphone, Camera, Film, Star, Flame, Zap, TrendingUp, Briefcase, ShoppingCart, Clock, Package, MessageSquare, CheckCircle } from 'lucide-react';

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
  const { data: gigs } = useQuery({ queryKey: ['featured-gigs'], queryFn: () => gigsAPI.getAll({ sort: 'rating' }).then(r => r.data) });

  const testimonials = [
    { name: 'Ajua N.', text: 'SkillBridge helped me ace my Python exam! My tutor was incredibly patient and knowledgeable.', rating: 5, institution: 'University of Ghana' },
    { name: 'Kudzo A.', text: 'I hired a freelancer to build my portfolio website and it was delivered in 3 days. Amazing quality for the price!', rating: 5, institution: 'KNUST' },
    { name: 'Pagnaa Z.', text: 'The platform is so easy to use. I went from zero to building my first app in just 3 tutoring sessions.', rating: 5, institution: 'Ashesi University' },
    { name: 'Kwamina K.', text: 'I posted a service request for logo design and got 4 applications within a day. The escrow system made me feel safe paying.', rating: 5, institution: 'University of Cape Coast' },
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
          <div className="absolute inset-0 bg-gradient-to-r from-red-brand/90 via-red-brand/80 to-orange-brand/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-6">
              <Flame className="h-4 w-4 text-orange-light" />
              <span>Trusted by students across Ghana</span>
            </div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight text-white">
              Learn, Hire & Sell <span className="text-orange-light">Tech Skills</span>
            </h1>
            <p className="text-lg text-white/80 mt-6 max-w-2xl">
              Ghana's student-powered marketplace for tutoring sessions and freelance services. Book a tutor, hire a freelancer, or sell your own skills — all with secure payments.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/browse" className="bg-white text-red-brand inline-flex items-center gap-2 text-lg px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
                Browse Tutors <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/marketplace" className="bg-white/10 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors text-lg border border-white/20 inline-flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Hire a Freelancer
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-red-brand">{stats?.tutors || 0}+</p>
              <p className="text-text-muted mt-1">Tutors & Freelancers</p>
            </div>
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-orange-brand">{stats?.sessions || 0}+</p>
              <p className="text-text-muted mt-1">Sessions Completed</p>
            </div>
            <div>
              <p className="font-display font-bold text-3xl sm:text-4xl text-primary">{gigs?.length || 0}+</p>
              <p className="text-text-muted mt-1">Services Available</p>
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
              <h2 className="font-display font-bold text-3xl text-text-main">Your Campus <span className="text-red-brand">Marketplace</span></h2>
              <p className="text-text-muted mt-3 leading-relaxed">
                SkillBridge is more than tutoring — it's a full e-business platform where students learn, earn, and grow. Book tutors, hire freelancers, or sell your own skills to fellow students across Ghana.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-brand/10 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-red-brand" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Book 1-on-1 tutoring sessions in 9+ tech skills</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Hire student freelancers for web, design, data & more</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-brand/10 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-orange-brand" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Cart, checkout & escrow payments for safe transactions</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-text-main">Institution-verified users you can trust</span>
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
          <h2 className="font-display font-bold text-3xl text-text-main">Explore <span className="text-red-brand">Skill Categories</span></h2>
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
              <h2 className="font-display font-bold text-3xl text-text-main">Top-Rated <span className="text-red-brand">Tutors</span></h2>
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

      {/* Featured Services / Marketplace */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-display font-bold text-3xl text-text-main">Freelance <span className="text-accent">Services</span></h2>
            <p className="text-text-muted mt-2">Hire skilled student freelancers for your projects</p>
          </div>
          <Link to="/marketplace" className="hidden sm:inline-flex items-center gap-1 text-accent font-medium hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gigs?.slice(0, 6).map(gig => (
            <Link key={gig.gig_id} to={`/gig/${gig.gig_id}`} className="card hover:shadow-md hover:border-accent/20 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">{gig.category_name}</span>
                {gig.avg_rating && (
                  <span className="flex items-center gap-1 text-sm text-accent">
                    <Star className="h-3.5 w-3.5 fill-accent" /> {gig.avg_rating}
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-text-main group-hover:text-accent transition-colors mb-2">{gig.title}</h3>
              <p className="text-text-muted text-sm line-clamp-2 mb-4">{gig.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">
                    {gig.freelancer_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{gig.freelancer_name}</p>
                    <p className="text-xs text-text-muted">{gig.institution}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent text-sm">GHS {Number(gig.min_price).toFixed(0)} - {Number(gig.max_price).toFixed(0)}</p>
                  {gig.delivery_time && (
                    <p className="text-xs text-text-muted flex items-center gap-1 justify-end"><Clock className="h-3 w-3" /> {gig.delivery_time}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Marketplace CTA */}
        <div className="mt-10 bg-gradient-to-r from-sidebar to-primary rounded-2xl p-8 lg:p-10 text-white">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="font-display font-bold text-2xl">Need something specific?</h3>
              <p className="text-white/80 mt-2">Post a service request and let freelancers come to you with proposals. Pay only when you're satisfied, with full escrow protection.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/marketplace" className="btn-accent inline-flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Browse Services
              </Link>
              <Link to="/service-requests" className="bg-white/10 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-white/20 transition-colors inline-flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Post a Request
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works — Two Flows */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-soft via-white to-red-50/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl text-text-main">How It <span className="text-red-brand">Works</span></h2>
            <p className="text-text-muted mt-2">Two ways to use SkillBridge</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Tutoring Flow */}
            <div className="card border-2 border-primary/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl text-primary">Book a Tutor</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: 1, icon: Search, title: 'Browse Tutors', desc: 'Search by skill, price, and rating' },
                  { step: 2, icon: Calendar, title: 'Pick a Time Slot', desc: 'Choose from available schedules' },
                  { step: 3, icon: CreditCard, title: 'Pay via Wallet', desc: 'Secure payment from your digital wallet' },
                  { step: 4, icon: GraduationCap, title: 'Learn & Review', desc: 'Attend session, then leave a review' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-text-muted text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/browse" className="btn-outline w-full text-center mt-6 flex items-center justify-center gap-2">Browse Tutors <ArrowRight className="h-4 w-4" /></Link>
            </div>

            {/* Service Flow */}
            <div className="card border-2 border-accent/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-display font-bold text-xl text-accent">Hire a Freelancer</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: 1, icon: Search, title: 'Browse Services', desc: 'Find gigs or post a service request' },
                  { step: 2, icon: ShoppingCart, title: 'Add to Cart & Checkout', desc: 'Add services to cart, pay at checkout' },
                  { step: 3, icon: Package, title: 'Escrow & Delivery', desc: 'Funds held in escrow until delivery' },
                  { step: 4, icon: CheckCircle, title: 'Confirm & Review', desc: 'Confirm delivery, funds released to freelancer' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-text-muted text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/marketplace" className="btn-accent w-full text-center mt-6 flex items-center justify-center gap-2">Browse Services <ArrowRight className="h-4 w-4" /></Link>
            </div>
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
            <h2 className="font-display font-bold text-3xl text-text-main">What Students <span className="text-red-brand">Say</span></h2>
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
          <h2 className="font-display font-bold text-3xl sm:text-4xl">Ready to Learn or Earn?</h2>
          <p className="text-white/80 mt-3 text-lg">Join students across Ghana — book a tutor, hire a freelancer, or start selling your skills today</p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link to="/register" className="bg-white text-red-brand px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Get Started Free
            </Link>
            <Link to="/browse" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Browse Tutors
            </Link>
            <Link to="/marketplace" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Hire Freelancers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
