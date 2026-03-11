import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', message = 'Check back later.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="font-display font-semibold text-lg text-text-main">{title}</h3>
      <p className="text-text-muted text-sm mt-1 max-w-sm">{message}</p>
    </div>
  );
}
