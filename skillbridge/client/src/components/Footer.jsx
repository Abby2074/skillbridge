import { Link } from 'react-router-dom';
import { BookOpen, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-sidebar text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-accent" />
              <span className="font-display font-bold text-lg">SkillBridge</span>
            </div>
            <p className="text-gray-400 text-sm">Connecting students with peer tutors for tech skills. Learn from the best on campus.</p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <div className="space-y-2">
              <Link to="/browse" className="block text-gray-400 text-sm hover:text-white transition-colors">Browse Tutors</Link>
              <Link to="/register" className="block text-gray-400 text-sm hover:text-white transition-colors">Become a Tutor</Link>
              <Link to="/support" className="block text-gray-400 text-sm hover:text-white transition-colors">Support</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4">Skills</h4>
            <div className="space-y-2 text-gray-400 text-sm">
              <p>Python Programming</p>
              <p>Web Development</p>
              <p>Data Analysis</p>
              <p>Graphic Design</p>
              <p>And more...</p>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-gray-400 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@skillbridge.gh</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> +233 XX XXX XXXX</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Accra, Ghana</div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} SkillBridge. Built for ICT E-Business Course. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
