export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-orange-brand/20 border-t-orange-brand rounded-full animate-spin"></div>
      <p className="mt-4 text-text-muted text-sm">{text}</p>
    </div>
  );
}
