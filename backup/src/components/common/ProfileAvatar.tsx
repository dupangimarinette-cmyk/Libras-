import React from 'react';
import { getEquippedFrame } from '../../data/profileFramesData';

interface ProfileAvatarProps {
  avatarUrl: string;
  username: string;
  frameId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackBorderColor?: string;
  showBadge?: boolean;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  username,
  frameId,
  size = 'md',
  className = '',
  fallbackBorderColor,
  showBadge = false,
}) => {
  const frame = getEquippedFrame(frameId);

  // Dimension classes
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8 sm:w-9 sm:h-9',
      image: 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl',
      badge: 'w-3.5 h-3.5 text-[8px] -bottom-1 -right-1',
      frameBorder: 'border-2',
    },
    md: {
      container: 'w-10 h-10 sm:w-11 sm:h-11',
      image: 'w-10 h-10 sm:w-11 sm:h-11 rounded-2xl',
      badge: 'w-4 h-4 text-[9px] -bottom-1 -right-1',
      frameBorder: 'border-2',
    },
    lg: {
      container: 'w-16 h-16 sm:w-20 sm:h-20',
      image: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
      badge: 'w-6 h-6 text-xs -bottom-1.5 -right-1.5',
      frameBorder: 'border-[3px]',
    },
    xl: {
      container: 'w-24 h-24 sm:w-28 sm:h-28',
      image: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl',
      badge: 'w-8 h-8 text-sm -bottom-2 -right-2',
      frameBorder: 'border-4',
    },
  }[size];

  // Specific styling depending on frame tier
  const getFrameVisuals = () => {
    if (!frame) {
      return {
        containerClass: '',
        imageClass: `${sizeConfig.frameBorder} transition-all duration-300 shadow-md`,
        imageStyle: fallbackBorderColor
          ? { borderColor: fallbackBorderColor }
          : { borderColor: 'rgba(255,255,255,0.15)' },
        halo: null,
      };
    }

    switch (frame.tier) {
      case 'bronze':
        return {
          containerClass: 'relative group',
          imageClass: `${sizeConfig.frameBorder} border-amber-500/90 shadow-lg shadow-amber-900/40`,
          imageStyle: {
            boxShadow: '0 0 14px rgba(217, 119, 6, 0.45)',
          },
          halo: 'bg-amber-600/20 blur-sm',
        };
      case 'prata':
        return {
          containerClass: 'relative group',
          imageClass: `${sizeConfig.frameBorder} border-slate-200/90 shadow-lg shadow-slate-400/30`,
          imageStyle: {
            boxShadow: '0 0 16px rgba(226, 232, 240, 0.55)',
          },
          halo: 'bg-slate-300/25 blur-sm',
        };
      case 'ouro':
        return {
          containerClass: 'relative group',
          imageClass: `${sizeConfig.frameBorder} border-amber-300 shadow-xl shadow-yellow-500/40 ring-1 ring-yellow-400/50`,
          imageStyle: {
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.65)',
          },
          halo: 'bg-yellow-400/30 blur-md',
        };
      case 'roxa':
        return {
          containerClass: 'relative group animate-pulse-slow',
          imageClass: `${sizeConfig.frameBorder} border-purple-400 shadow-xl shadow-fuchsia-600/40 ring-2 ring-purple-500/50`,
          imageStyle: {
            boxShadow: '0 0 22px rgba(168, 85, 247, 0.75)',
          },
          halo: 'bg-purple-500/35 blur-md',
        };
      case 'lendaria':
        return {
          containerClass: 'relative group',
          imageClass: `${sizeConfig.frameBorder} border-transparent bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-300 p-0.5 shadow-2xl`,
          imageStyle: {
            boxShadow: '0 0 26px rgba(6, 182, 212, 0.8), 0 0 12px rgba(236, 72, 153, 0.6)',
          },
          halo: 'bg-gradient-to-r from-cyan-400/30 via-purple-500/30 to-amber-400/30 blur-lg',
        };
      default:
        return {
          containerClass: '',
          imageClass: `${sizeConfig.frameBorder} border-slate-700`,
          imageStyle: {},
          halo: null,
        };
    }
  };

  const visuals = getFrameVisuals();

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${sizeConfig.container} ${visuals.containerClass} ${className}`}>
      {/* Dynamic Halo Glow behind avatar when framed */}
      {visuals.halo && (
        <div
          className={`absolute -inset-1 rounded-3xl pointer-events-none transition-all duration-300 ${visuals.halo}`}
        />
      )}

      {/* Actual Avatar Image */}
      <img
        src={avatarUrl}
        alt={username}
        className={`relative z-10 object-cover ${sizeConfig.image} ${visuals.imageClass}`}
        style={visuals.imageStyle}
        loading="lazy"
      />

      {/* Optional Frame Badge Icon */}
      {showBadge && frame && (
        <span
          className={`absolute z-20 flex items-center justify-center rounded-full bg-slate-900 border border-white/20 shadow-lg ${sizeConfig.badge}`}
          title={`${frame.name} (${frame.rarityLabel})`}
        >
          {frame.badgeEmoji}
        </span>
      )}
    </div>
  );
};
