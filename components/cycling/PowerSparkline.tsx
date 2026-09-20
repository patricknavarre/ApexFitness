'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
} from 'recharts';

export function PowerSparkline({
  samples,
}: {
  samples: { t: number; w: number }[];
}) {
  if (samples.length < 2) {
    return (
      <div className="h-28 rounded-card border border-border bg-bg2 flex items-center justify-center font-sans text-sm text-muted">
        Power chart fills as you ride
      </div>
    );
  }

  return (
    <div className="h-28 rounded-card border border-border bg-bg2 px-1 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={samples}>
          <YAxis domain={['auto', 'auto']} hide width={0} />
          <Tooltip
            contentStyle={{
              background: 'var(--card, #1a1a1a)',
              border: '1px solid var(--border, #333)',
              fontSize: 12,
            }}
            labelFormatter={() => ''}
            formatter={(value: number) => [`${Math.round(value)} W`, 'Power']}
          />
          <Area
            type="monotone"
            dataKey="w"
            stroke="var(--accent, #c4a574)"
            fill="var(--accent, #c4a574)"
            fillOpacity={0.2}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
