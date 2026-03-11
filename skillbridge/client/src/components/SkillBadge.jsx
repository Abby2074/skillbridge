const SKILL_COLORS = {
  'Python Programming': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Web Development (HTML, CSS, JavaScript)': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Data Analysis (Microsoft Excel, Power BI, Google Sheets)': { bg: 'bg-green-100', text: 'text-green-700' },
  'Graphic Design (Canva, Adobe Photoshop, Figma)': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Database Design and SQL': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  'Video Editing (Adobe Premiere Pro, CapCut)': { bg: 'bg-red-100', text: 'text-red-700' },
  'Photography Editing (Adobe Lightroom, Adobe Photoshop)': { bg: 'bg-pink-100', text: 'text-pink-700' },
  'Cybersecurity Fundamentals': { bg: 'bg-slate-100', text: 'text-slate-700' },
  'Mobile Application Development': { bg: 'bg-teal-100', text: 'text-teal-700' },
};

export default function SkillBadge({ skill, size = 'md' }) {
  const colors = SKILL_COLORS[skill] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  const shortName = skill?.split('(')[0]?.trim() || skill;

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-block rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}>
      {shortName}
    </span>
  );
}
