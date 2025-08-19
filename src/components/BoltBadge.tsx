import React from 'react';

interface BoltBadgeProps {
  className?: string;
}

const BoltBadge: React.FC<BoltBadgeProps> = ({ className = "" }) => {
  return (
    <a
      href="https://bolt.new/"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block transition-transform hover:scale-105 ${className}`}
      title="Powered by Bolt.new"
    >
      <img
        src="https://obgbnrasiyozdnmoixxx.supabase.co/storage/v1/object/public/music//black_circle_360x360.png"
        alt="Powered by Bolt.new"
        className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
      />
    </a>
  );
};

export default BoltBadge;