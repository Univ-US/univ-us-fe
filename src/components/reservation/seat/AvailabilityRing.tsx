type AvailabilityRingProps = {
  free: number;
  total: number;
  danger: boolean;
};

export default function AvailabilityRing({
  free,
  total,
  danger,
}: AvailabilityRingProps) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = danger ? '#E04E3A' : '#0FA896';
  const ratio = total > 0 ? free / total : 0;

  return (
    <div className='relative shrink-0' style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='#EDF1F0'
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          strokeLinecap='round'
          style={{ transition: 'stroke-dashoffset .5s' }}
        />
      </svg>
      <div className='absolute inset-0 flex flex-col items-center justify-center leading-none'>
        <span
          className='text-[15px] font-extrabold'
          style={{ color: danger ? '#E04E3A' : '#141A19' }}
        >
          {free}
        </span>
        <span className='mt-0.5 text-[9px] text-slate-400'>석</span>
      </div>
    </div>
  );
}
