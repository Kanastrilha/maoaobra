// src/components/ui/StarRating.jsx
export default function StarRating({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'text-xs' : 'text-lg';
  return (
    <div className={`inline-flex items-center gap-0.5 ${sz}`}>
      {[1, 2, 3, 4, 5].map(i => {
        if (i <= Math.floor(rating)) return <i key={i} className="ph-fill ph-star text-amber-400" />;
        if (i === Math.ceil(rating) && !Number.isInteger(rating)) return <i key={i} className="ph-fill ph-star-half text-amber-400" />;
        return <i key={i} className="ph-fill ph-star text-slate-200" />;
      })}
    </div>
  );
}
