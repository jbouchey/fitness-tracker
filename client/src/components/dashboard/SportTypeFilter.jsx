import { SPORT_FILTER_OPTIONS } from '../../utils/constants';

export default function SportTypeFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {SPORT_FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
            value === opt.value
              ? 'bg-brand-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
