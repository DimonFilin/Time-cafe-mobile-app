import Svg, { Path } from 'react-native-svg';

const VB_W = 360.67;
const VB_H = 446.4;

export function BelarussianRubelIcon({
  size = 16,
  color,
}: {
  size?: number;
  /** Falls back to inheriting from parent Text color when omitted */
  color?: string;
}) {
  const height = (size * VB_H) / VB_W;
  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} accessibilityElementsHidden>
      <Path
        fill={color ?? 'currentColor'}
        d="M475.61,528.84c0-72.5-62.75-131.27-140.16-131.27H227.58V263.37H426v-49.6H178v290h-63.1v49.7H178V660.17h49.54l107.92-.07c77.36,0,140.11-58.77,140.11-131.26Zm-248-25.1V447.1c35.89,0,72.35.07,107.87.07,50,0,90.56,36.57,90.56,81.67s-40.54,81.67-90.56,81.7l-107.87,0V553.44h112.7v-49.7Z"
        transform="translate(-114.94 -213.77)"
      />
    </Svg>
  );
}
