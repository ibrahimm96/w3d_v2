// GDD tomato-plant loading indicator. Recreated pixel-for-pixel from the
// Claude Design handoff (loading-spinner-animation/project/Tomato Loader.html).
// Pure CSS animation; styles live under `.gdd-loader` in app.css. Loops 4.8s:
// soil draws in, stem grows, leaves pop, trusses extend, fruit pops and ripens.

type TomatoLoaderProps = {
  /** Rendered SVG width in px (height scales to keep the 232×196 aspect). */
  size?: number;
  label?: string;
};

export function TomatoLoader({ size = 300, label = "Loading weather data" }: TomatoLoaderProps) {
  const height = Math.round((size * 252) / 300);
  return (
    <div className="gdd-loader" role="status" aria-label={label}>
      <svg width={size} height={height} viewBox="0 0 232 196" aria-hidden="true">
        <line className="soil" x1="80" y1="182" x2="152" y2="182" pathLength={1} />
        <path
          className="stem"
          d="M 116 182 C 116 156, 113 128, 116 102 C 118 82, 115 70, 116 56"
          pathLength={1}
        />
        <g transform="translate(117, 62)">
          <path className="leaf l4" d="M 0 0 Q 13 -2 19 -14 Q 5 -12 0 0 Z" />
        </g>
        <g transform="translate(115, 76)">
          <path className="leaf l3" d="M 0 0 Q -15 -2 -23 -16 Q -6 -14 0 0 Z" />
        </g>
        <g transform="translate(117, 90)">
          <path className="leaf l2" d="M 0 0 Q 16 -2 24 -17 Q 7 -15 0 0 Z" />
        </g>
        <g transform="translate(115, 110)">
          <path className="leaf l1" d="M 0 0 Q -16 -2 -24 -17 Q -7 -15 0 0 Z" />
        </g>
        <g transform="translate(105, 152)">
          <g className="fruit fa">
            <circle className="body rS" cx="0" cy="0" r="9" />
            <path className="calyx" d="M -4 -9 L 0 -12 L 4 -9 L 0 -6.5 Z" />
          </g>
        </g>
        <g transform="translate(127, 146)">
          <g className="fruit fb">
            <circle className="body rS" cx="0" cy="0" r="9" />
            <path className="calyx" d="M -4 -9 L 0 -12 L 4 -9 L 0 -6.5 Z" />
          </g>
        </g>
        <g transform="translate(106, 123)">
          <g className="fruit fc">
            <circle className="body rM" cx="0" cy="0" r="7.5" />
            <path className="calyx" d="M -3.5 -7.5 L 0 -10 L 3.5 -7.5 L 0 -5.5 Z" />
          </g>
        </g>
        <g transform="translate(126, 119)">
          <g className="fruit fd">
            <circle className="body rM" cx="0" cy="0" r="7.5" />
            <path className="calyx" d="M -3.5 -7.5 L 0 -10 L 3.5 -7.5 L 0 -5.5 Z" />
          </g>
        </g>
        <g transform="translate(107, 99)">
          <g className="fruit fe">
            <circle className="body rL" cx="0" cy="0" r="6" />
            <path className="calyx" d="M -3 -6 L 0 -8.5 L 3 -6 L 0 -4.5 Z" />
          </g>
        </g>
        <g transform="translate(125, 96)">
          <g className="fruit ff">
            <circle className="body rL" cx="0" cy="0" r="6" />
            <path className="calyx" d="M -3 -6 L 0 -8.5 L 3 -6 L 0 -4.5 Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
