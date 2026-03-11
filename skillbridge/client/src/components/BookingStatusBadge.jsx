const STATUS_STYLES = {
  requested: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Requested' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  rated: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Rated' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

export default function BookingStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
